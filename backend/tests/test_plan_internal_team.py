"""Plan feature access for Pro, Business, Organisation, and internal team."""
from plan_features import has_feature, plan_features
from plan_signing import get_effective_plan, is_internal_team


def test_internal_team_treated_as_business():
    staff = {"user_id": "user_staff", "role": "staff", "plan": "free"}
    admin = {"user_id": "user_admin", "role": "admin", "plan": "free"}
    assert is_internal_team(staff)
    assert is_internal_team(admin)
    assert get_effective_plan(staff) == "business"
    assert get_effective_plan(admin) == "business"
    assert plan_features(staff)["manage_pdf"] is True
    assert plan_features(admin).get("internal_team") is True


def test_organisation_member_has_manage_pdf():
    member = {
        "user_id": "user_mem",
        "role": "user",
        "plan": "free",
        "org_id": "org_bank",
        "org_role": "member",
    }
    assert get_effective_plan(member) == "business"
    assert has_feature(member, "manage_pdf")