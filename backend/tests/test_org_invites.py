"""Organisation email invite helpers."""
from plan_features import (
    has_feature,
    normalize_org_member_feature_flags,
    default_org_member_feature_flags,
    plan_features,
)


def test_normalize_org_member_feature_flags():
    flags = normalize_org_member_feature_flags({"bulk_send": False})
    assert flags["bulk_send"] is False
    assert flags["manage_pdf"] is True


def test_default_org_member_feature_flags():
    flags = default_org_member_feature_flags()
    assert flags["manage_pdf"] is True
    assert "api_webhooks" not in flags


def test_org_member_feature_overrides_applied():
    member = {
        "user_id": "user_mem",
        "role": "user",
        "plan": "free",
        "org_id": "org_bank",
        "org_role": "member",
        "org_feature_flags": {"bulk_send": False, "manage_pdf": False},
    }
    feats = plan_features(member)
    assert feats["bulk_send"] is False
    assert feats["manage_pdf"] is False
    assert feats["api_webhooks"] is False
    assert has_feature(member, "team_templates") is True


def test_org_owner_keeps_api_webhooks_flag_in_catalog():
    owner = {
        "user_id": "user_own",
        "role": "user",
        "plan": "business",
        "org_id": "org_bank",
        "org_role": "owner",
    }
    feats = plan_features(owner)
    assert feats["api_webhooks"] is True