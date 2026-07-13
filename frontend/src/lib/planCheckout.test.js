import {
  buildPlanCtaPath,
  buildPlanSignupPath,
  buildPostAuthCheckoutPath,
} from "./planCheckout";

describe("planCheckout", () => {
  it("builds post-auth checkout path for paid plans", () => {
    expect(buildPostAuthCheckoutPath("pro", "monthly")).toBe(
      "/settings?tab=subscription&upgrade=pro&checkout=1&interval=monthly",
    );
    expect(buildPostAuthCheckoutPath("Business", "yearly")).toBe(
      "/settings?tab=subscription&upgrade=business&checkout=1&interval=yearly",
    );
    expect(buildPostAuthCheckoutPath("free")).toBeNull();
  });

  it("builds register path with plan intent and encoded next", () => {
    expect(buildPlanSignupPath("pro", "yearly")).toBe(
      "/register?plan=pro&interval=yearly&next=%2Fsettings%3Ftab%3Dsubscription%26upgrade%3Dpro%26checkout%3D1%26interval%3Dyearly",
    );
  });

  it("routes logged-in users straight to checkout", () => {
    const user = { plan: "free" };
    expect(buildPlanCtaPath("Pro", "monthly", user)).toBe(
      "/settings?tab=subscription&upgrade=pro&checkout=1&interval=monthly",
    );
    expect(buildPlanCtaPath("Pro", "monthly", null)).toContain("/register?plan=pro");
  });
});