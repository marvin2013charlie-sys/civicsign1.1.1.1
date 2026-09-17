import pytest
from fastapi import HTTPException
import signature_levels as levels

@pytest.mark.parametrize('requested', ['aes', 'qes', ' AES ', 'QES'])
def test_unsupported_assurance_cannot_be_requested(requested):
    with pytest.raises(HTTPException) as error:
        levels.resolve_send_signature_level({'plan': 'business'}, requested)
    assert error.value.status_code == 400

@pytest.mark.parametrize('level', ['aes', 'qes'])
def test_legacy_records_do_not_generate_assurance_claims(level):
    evidence = levels.build_signer_evidence(level, ip='127.0.0.1', user_agent='test', signed_at='now', signer_email='a@example.com', signer_name='Test')
    assert evidence['signature_level'] == 'SES'
    assert 'criteria' not in evidence
    assert 'qtsp' not in evidence
    assert 'does not establish' in levels.certificate_footer(level)
    assert levels.resolve_signer_view_level({'signature_level': level}, None) == 'ses'

def test_plan_flags_cannot_enable_unimplemented_levels(monkeypatch):
    import plan_features
    monkeypatch.setattr(plan_features, 'has_feature', lambda *args: True)
    assert levels.allowed_levels_for_user({'plan': 'business'}) == ['basic', 'ses']
    assert levels.default_level_for_user({'plan': 'business'}) == 'ses'
