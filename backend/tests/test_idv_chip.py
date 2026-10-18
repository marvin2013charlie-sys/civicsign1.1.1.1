"""Passport chip passive authentication (ICAO 9303).

Built on a synthetic country chain so the cryptography is exercised for real:
a country signing certificate, a document signer it issues, and a security
object signed by that document signer.
"""
import hashlib
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from asn1crypto import algos, cms, core, x509 as a_x509  # noqa: E402
from cryptography import x509  # noqa: E402
from cryptography.hazmat.primitives import hashes, serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa, padding  # noqa: E402
from cryptography.x509.oid import NameOID  # noqa: E402

from idv import chip  # noqa: E402

DG1 = b"\x61\x5bP<GBRPATEL<<SIAN<<<<<<<<<<<<<<<<<<<<<<<<<<<<1234567897GBR9001011F3504152<<<<<<<<<<<<<<02"
LDS_OID = "2.23.136.1.1.1"


def _keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _certificate(subject_cn, country, key, issuer_cert=None, issuer_key=None):
    name = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, country),
        x509.NameAttribute(NameOID.COMMON_NAME, subject_cn),
    ])
    issuer_name = issuer_cert.subject if issuer_cert else name
    now = datetime.now(timezone.utc)
    builder = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(issuer_name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=365))
    )
    return builder.sign(issuer_key or key, hashes.SHA256())


def _lds_security_object(dg1_hash: bytes) -> bytes:
    """LDSSecurityObject ::= SEQUENCE { version, hashAlgorithm, dataGroupHashValues }."""
    algorithm = algos.DigestAlgorithm({"algorithm": "sha256"}).dump()
    # DataGroupHash ::= SEQUENCE { dataGroupNumber INTEGER, dataGroupHashValue OCTET STRING }
    entry = b"\x02\x01\x01" + b"\x04" + _length(len(dg1_hash)) + dg1_hash
    entry_seq = b"\x30" + _length(len(entry)) + entry
    hash_list = b"\x30" + _length(len(entry_seq)) + entry_seq
    body = core.Integer(0).dump() + algorithm + hash_list
    return b"\x30" + _length(len(body)) + body


def _length(n: int) -> bytes:
    if n < 0x80:
        return bytes([n])
    out = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([0x80 | len(out)]) + out


def _security_object(dsc_cert, dsc_key, dg1: bytes) -> bytes:
    econtent = _lds_security_object(hashlib.sha256(dg1).digest())
    signed_attrs = cms.CMSAttributes([
        cms.CMSAttribute({"type": "content_type", "values": [LDS_OID]}),
        cms.CMSAttribute({
            "type": "message_digest",
            "values": [hashlib.sha256(econtent).digest()],
        }),
    ])
    signature = dsc_key.sign(signed_attrs.dump(), padding.PKCS1v15(), hashes.SHA256())
    dsc = a_x509.Certificate.load(dsc_cert.public_bytes(serialization.Encoding.DER))
    signer = cms.SignerInfo({
        "version": "v1",
        "sid": cms.SignerIdentifier({
            "issuer_and_serial_number": cms.IssuerAndSerialNumber({
                "issuer": dsc["tbs_certificate"]["issuer"],
                "serial_number": dsc["tbs_certificate"]["serial_number"],
            })
        }),
        "digest_algorithm": algos.DigestAlgorithm({"algorithm": "sha256"}),
        "signed_attrs": signed_attrs,
        "signature_algorithm": algos.SignedDigestAlgorithm({"algorithm": "rsassa_pkcs1v15"}),
        "signature": signature,
    })
    signed_data = cms.SignedData({
        "version": "v3",
        "digest_algorithms": [algos.DigestAlgorithm({"algorithm": "sha256"})],
        "encap_content_info": {"content_type": LDS_OID, "content": econtent},
        "certificates": [dsc],
        "signer_infos": [signer],
    })
    return cms.ContentInfo({"content_type": "signed_data", "content": signed_data}).dump()


@pytest.fixture(scope="module")
def chain():
    csca_key = _keypair()
    csca = _certificate("UK Country Signer", "GB", csca_key)
    dsc_key = _keypair()
    dsc = _certificate("UK Document Signer", "GB", dsc_key, csca, csca_key)
    return {"csca": csca, "dsc": dsc, "dsc_key": dsc_key,
            "sod": _security_object(dsc, dsc_key, DG1)}


def test_a_genuine_chip_passes_passive_authentication(chain):
    result = chip.verify(chain["sod"], DG1, trusted=[chain["csca"]])
    assert result.dg1_matches
    assert result.sod_signature_valid
    assert result.issuer_trusted is True
    assert result.authentic
    assert result.signer_country == "GB"
    assert result.problems == []


def test_altered_data_group_is_detected(chain):
    tampered = DG1.replace(b"PATEL", b"SMITH")
    result = chip.verify(chain["sod"], tampered, trusted=[chain["csca"]])
    assert result.dg1_matches is False
    assert result.authentic is False


def test_security_object_signed_by_an_unknown_country_is_not_trusted(chain):
    other_key = _keypair()
    other = _certificate("Elsewhere Country Signer", "ZZ", other_key)
    result = chip.verify(chain["sod"], DG1, trusted=[other])
    assert result.sod_signature_valid is True
    assert result.issuer_trusted is False
    assert result.authentic is False


def test_without_a_trust_store_the_chip_is_not_called_authentic(chain, monkeypatch):
    monkeypatch.setenv("IDV_CHIP_REQUIRE_TRUSTED_ISSUER", "true")
    result = chip.verify(chain["sod"], DG1, trusted=[])
    assert result.issuer_trusted is None
    assert result.authentic is False
    assert any("issuer unverified" in p for p in result.problems)


def test_relaxing_the_issuer_check_is_a_deliberate_setting(chain, monkeypatch):
    monkeypatch.setenv("IDV_CHIP_REQUIRE_TRUSTED_ISSUER", "false")
    result = chip.verify(chain["sod"], DG1, trusted=[])
    assert result.authentic is True


def test_rubbish_security_object_fails_cleanly():
    result = chip.verify(b"not a security object", DG1, trusted=[])
    assert result.authentic is False
    assert result.problems


def test_summary_carries_outcomes_not_chip_contents(chain):
    summary = chip.verify(chain["sod"], DG1, trusted=[chain["csca"]]).summary()
    assert summary["dg1_matches"] is True
    assert "PATEL" not in str(summary)
