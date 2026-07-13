import { resolvePlanFeatures, hasPlanFeature } from "./planFeatures";

describe("resolvePlanFeatures org members", () => {
  it("defaults organisation users to manage_pdf when plan_features is absent", () => {
    const member = {
      org_id: "org_1",
      org_role: "member",
    };
    const feats = resolvePlanFeatures(member);
    expect(feats.manage_pdf).toBe(true);
    expect(feats.organisation_plan).toBe(true);
  });

  it("free users never get manage_pdf", () => {
    const free = { plan: "free", plan_features: { plan: "free" } };
    expect(resolvePlanFeatures(free).manage_pdf).toBe(false);
    expect(hasPlanFeature(free, "manage_pdf")).toBe(false);
  });

  it("respects org_feature_flags from API instead of forcing business features", () => {
    const member = {
      org_id: "org_1",
      org_role: "member",
      plan_features: {
        plan: "business",
        manage_pdf: false,
        bulk_send: false,
        seal_verification: true,
        api_webhooks: false,
      },
    };
    const feats = resolvePlanFeatures(member);
    expect(feats.manage_pdf).toBe(false);
    expect(feats.bulk_send).toBe(false);
    expect(feats.seal_verification).toBe(true);
    expect(feats.api_webhooks).toBe(false);
    expect(feats.organisation_plan).toBe(true);
    expect(hasPlanFeature(member, "manage_pdf")).toBe(false);
  });

  it("allows api_webhooks for org owners when enabled in plan_features", () => {
    const owner = {
      org_id: "org_1",
      org_role: "owner",
      plan_features: {
        plan: "business",
        api_webhooks: true,
        manage_pdf: true,
      },
    };
    const feats = resolvePlanFeatures(owner);
    expect(feats.api_webhooks).toBe(true);
    expect(feats.pricing_note).toBeTruthy();
  });
});