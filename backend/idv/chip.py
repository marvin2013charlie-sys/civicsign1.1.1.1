"""Passport chip verification — ICAO 9303 passive authentication.

The phone reads the chip; this module decides whether to believe it. That
split matters: an app can be tampered with, so "the chip verified" must never
be a claim the client makes. The app sends what it read — the security object
and the data groups — and the server checks the cryptography itself.

Passive authentication asks three questions:
  1. Do the data groups match the hashes in the security object?
  2. Is the security object genuinely signed by its document signer?
  3. Does that document signer chain to a country signing certificate we trust?

Without question 3 the chip proves only internal consistency, so a trusted
issuer store (IDV_CSCA_DIR) is required unless it is explicitly relaxed.
"""
from __future__ import annotations

import hashlib
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("civicsign.idv.chip")


def mrz_from_dg1(dg1: bytes) -> str | None:
    """DG1 wraps the MRZ in BER-TLV: template 0x61, then field 0x5F1F."""
    data = bytes(dg1 or b"")
    marker = data.find(b"\x5f\x1f")
    if marker >= 0:
        pos = marker + 2
        length = data[pos]
        pos += 1
        if length & 0x80:
            count = length & 0x7F
            length = int.from_bytes(data[pos:pos + count], "big")
            pos += count
        body = data[pos:pos + length]
    else:
        # Some readers hand over the bare MRZ characters.
        body = data.lstrip(b"\x61")
        if body[:1] and body[0] < 0x20:
            body = body[1:]
    text = "".join(chr(c) for c in body if 32 <= c < 127).strip()
    for count, length in ((2, 44), (2, 36), (3, 30)):
        if len(text) == count * length:
            return "\n".join(text[i * length:(i + 1) * length] for i in range(count))
    return None


def _lds_specs():
    """ASN.1 shape of the security object (ICAO 9303 part 10)."""
    from asn1crypto import algos, core

    class DataGroupHash(core.Sequence):
        _fields = [
            ("data_group_number", core.Integer),
            ("data_group_hash_value", core.OctetString),
        ]

    class DataGroupHashValues(core.SequenceOf):
        _child_spec = DataGroupHash

    class LDSVersionInfo(core.Sequence):
        _fields = [
            ("lds_version", core.PrintableString),
            ("unicode_version", core.PrintableString),
        ]

    class LDSSecurityObject(core.Sequence):
        _fields = [
            ("version", core.Integer),
            ("hash_algorithm", algos.DigestAlgorithm),
            ("data_group_hash_values", DataGroupHashValues),
            ("lds_version_info", LDSVersionInfo, {"optional": True}),
        ]

    return LDSSecurityObject

_HASHES = {
    "sha1": hashlib.sha1,
    "sha224": hashlib.sha224,
    "sha256": hashlib.sha256,
    "sha384": hashlib.sha384,
    "sha512": hashlib.sha512,
}


def csca_dir() -> str:
    return os.environ.get("IDV_CSCA_DIR", "").strip()


def require_trusted_issuer() -> bool:
    return (os.environ.get("IDV_CHIP_REQUIRE_TRUSTED_ISSUER", "true").lower().strip()
            != "false")


@dataclass
class ChipResult:
    dg1_matches: bool = False
    sod_signature_valid: bool = False
    issuer_trusted: bool | None = None       # None when no trust store is loaded
    dg1_mrz: str | None = None
    signer_country: str | None = None
    problems: list[str] = field(default_factory=list)

    @property
    def authentic(self) -> bool:
        if not (self.dg1_matches and self.sod_signature_valid):
            return False
        if require_trusted_issuer():
            return self.issuer_trusted is True
        return self.issuer_trusted is not False

    def summary(self) -> dict:
        """Evidence for the certificate — outcomes only, no chip contents."""
        return {
            "dg1_matches": self.dg1_matches,
            "sod_signature_valid": self.sod_signature_valid,
            "issuer_trusted": self.issuer_trusted,
            "signer_country": self.signer_country,
        }


def load_trusted_issuers() -> list:
    """Country signing certificates we accept, as PEM or DER files on disk."""
    from cryptography import x509

    directory = csca_dir()
    if not directory or not Path(directory).is_dir():
        return []
    certs = []
    for path in sorted(Path(directory).iterdir()):
        if path.suffix.lower() not in (".pem", ".cer", ".crt", ".der"):
            continue
        raw = path.read_bytes()
        try:
            certs.append(
                x509.load_pem_x509_certificate(raw) if b"-----BEGIN" in raw
                else x509.load_der_x509_certificate(raw)
            )
        except Exception as exc:
            logger.warning(f"[idv-chip] could not read issuer certificate {path.name}: {exc}")
    return certs


def _digest(algorithm: str, data: bytes) -> bytes:
    func = _HASHES.get((algorithm or "").lower().replace("-", ""))
    if not func:
        raise ValueError(f"Unsupported hash algorithm {algorithm!r}")
    return func(data).digest()


def _country_of(certificate) -> str | None:
    from cryptography.x509.oid import NameOID

    values = certificate.subject.get_attributes_for_oid(NameOID.COUNTRY_NAME)
    return values[0].value if values else None


def verify(sod_der: bytes, dg1: bytes, *, trusted: list | None = None) -> ChipResult:
    """Run passive authentication over a security object and DG1."""
    from asn1crypto import cms
    from cryptography import x509
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives import hashes as c_hashes
    from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa

    result = ChipResult()
    try:
        content = cms.ContentInfo.load(sod_der)
        signed = content["content"]
    except Exception as exc:
        result.problems.append(f"Security object could not be parsed: {exc}")
        return result

    # --- 1. data group hashes ------------------------------------------------
    try:
        encap = signed["encap_content_info"]["content"].native
        lds = _parse_lds(encap)
        algorithm = lds["algorithm"]
        expected = lds["hashes"].get(1)
        if expected is None:
            result.problems.append("Security object does not cover DG1")
        else:
            result.dg1_matches = _digest(algorithm, dg1) == expected
            if not result.dg1_matches:
                result.problems.append("DG1 does not match the hash in the security object")
    except Exception as exc:
        result.problems.append(f"Could not read data group hashes: {exc}")

    # --- 2. signature over the security object -------------------------------
    try:
        signer_info = signed["signer_infos"][0]
        certificates = [
            x509.load_der_x509_certificate(c.dump()) for c in signed["certificates"]
        ]
        dsc = certificates[0]
        result.signer_country = _country_of(dsc)
        signed_attrs = signer_info["signed_attrs"]
        tbs = signed_attrs.dump()
        if tbs[:1] != b"\x31":  # implicit [0] -> explicit SET OF for verification
            tbs = b"\x31" + tbs[1:]
        digest_algorithm = signer_info["digest_algorithm"]["algorithm"].native
        signature = signer_info["signature"].native
        public_key = dsc.public_key()
        hash_alg = {"sha1": c_hashes.SHA1(), "sha224": c_hashes.SHA224(),
                    "sha256": c_hashes.SHA256(), "sha384": c_hashes.SHA384(),
                    "sha512": c_hashes.SHA512()}[digest_algorithm.lower().replace("-", "")]
        if isinstance(public_key, rsa.RSAPublicKey):
            public_key.verify(signature, tbs, padding.PKCS1v15(), hash_alg)
        elif isinstance(public_key, ec.EllipticCurvePublicKey):
            public_key.verify(signature, tbs, ec.ECDSA(hash_alg))
        else:
            raise ValueError("Unsupported document signer key type")
        result.sod_signature_valid = True
    except (InvalidSignature, Exception) as exc:
        result.problems.append(f"Security object signature did not verify: {exc}")
        return result

    # --- 3. issuer trust -----------------------------------------------------
    store = load_trusted_issuers() if trusted is None else trusted
    if not store:
        result.issuer_trusted = None
        result.problems.append("No country signing certificates loaded — issuer unverified")
        return result

    now = datetime.now(timezone.utc)
    for csca in store:
        if csca.subject != dsc.issuer:
            continue
        try:
            _verify_certificate(csca, dsc)
        except Exception:
            continue
        if csca.not_valid_before_utc <= now <= csca.not_valid_after_utc:
            result.issuer_trusted = True
            break
    if result.issuer_trusted is not True:
        result.issuer_trusted = False
        result.problems.append("Document signer does not chain to a trusted country certificate")
    return result


def _verify_certificate(issuer, certificate) -> None:
    from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa

    public_key = issuer.public_key()
    if isinstance(public_key, rsa.RSAPublicKey):
        public_key.verify(
            certificate.signature,
            certificate.tbs_certificate_bytes,
            padding.PKCS1v15(),
            certificate.signature_hash_algorithm,
        )
    elif isinstance(public_key, ec.EllipticCurvePublicKey):
        public_key.verify(
            certificate.signature,
            certificate.tbs_certificate_bytes,
            ec.ECDSA(certificate.signature_hash_algorithm),
        )
    else:
        raise ValueError("Unsupported country signing key type")


def _parse_lds(encap) -> dict:
    """Pull the hash algorithm and data group hashes out of the LDS object."""
    raw = encap if isinstance(encap, bytes) else bytes(encap)
    lds = _lds_specs().load(raw)
    algorithm = lds["hash_algorithm"]["algorithm"].native
    hashes = {
        int(entry["data_group_number"].native): bytes(entry["data_group_hash_value"].native)
        for entry in lds["data_group_hash_values"]
    }
    return {"algorithm": str(algorithm), "hashes": hashes}
