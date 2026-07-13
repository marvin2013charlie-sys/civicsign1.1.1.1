"""Signer PDF download must match signing authorization rules."""
import pytest

from server import _assert_signer_file_access, can_sign


def _env(**overrides):
    base = {
        "status": "sent",
        "signing_order": "sequential",
        "recipients": [],
    }
    base.update(overrides)
    return base


def _recipient(**overrides):
    base = {
        "recipient_id": "r1",
        "status": "viewed",
        "order": 1,
        "access_token": "tok",
    }
    base.update(overrides)
    return base


def test_signed_recipient_may_review_pdf():
    env = _env(status="viewed")
    rec = _recipient(status="signed")
    _assert_signer_file_access(env, rec)


def test_waiting_turn_blocked():
    env = _env(
        recipients=[
            _recipient(recipient_id="r1", order=1, status="pending"),
            _recipient(recipient_id="r2", order=2, status="viewed"),
        ],
    )
    rec = env["recipients"][1]
    assert not can_sign(env, rec)
    with pytest.raises(Exception) as exc:
        _assert_signer_file_access(env, rec)
    assert exc.value.status_code == 403


def test_auth_required_before_pdf():
    env = _env()
    rec = _recipient(auth_method="sms", auth_verified=False)
    with pytest.raises(Exception) as exc:
        _assert_signer_file_access(env, rec)
    assert exc.value.status_code == 403


def test_completed_uses_completed_endpoint():
    env = _env(status="completed")
    rec = _recipient()
    with pytest.raises(Exception) as exc:
        _assert_signer_file_access(env, rec)
    assert exc.value.status_code == 400