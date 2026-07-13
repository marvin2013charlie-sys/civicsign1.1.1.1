import { isInAppArea, resolveLogoHomePath } from "./logoHome";

const loggedInUser = { user_id: "u1", plan: "free" };
const adminUser = { user_id: "a1", role: "admin" };

describe("logoHome", () => {
  describe("isInAppArea", () => {
    it("treats marketing and signer routes as public", () => {
      expect(isInAppArea("/")).toBe(false);
      expect(isInAppArea("/solutions/sales")).toBe(false);
      expect(isInAppArea("/sign/abc123")).toBe(false);
      expect(isInAppArea("/admin/login")).toBe(false);
    });

    it("treats product and admin console routes as in-app", () => {
      expect(isInAppArea("/dashboard")).toBe(true);
      expect(isInAppArea("/prepare/env_1")).toBe(true);
      expect(isInAppArea("/admin")).toBe(true);
      expect(isInAppArea("/admin/users")).toBe(true);
    });
  });

  describe("resolveLogoHomePath", () => {
    it("sends guests to the landing page", () => {
      expect(resolveLogoHomePath(false, "/dashboard")).toBe("/");
      expect(resolveLogoHomePath(null, "/")).toBe("/");
    });

    it("keeps logged-in users on marketing pages at the landing page", () => {
      expect(resolveLogoHomePath(loggedInUser, "/")).toBe("/");
      expect(resolveLogoHomePath(loggedInUser, "/solutions/hr")).toBe("/");
    });

    it("sends logged-in users in the product to the dashboard", () => {
      expect(resolveLogoHomePath(loggedInUser, "/dashboard")).toBe("/dashboard");
      expect(resolveLogoHomePath(loggedInUser, "/usage")).toBe("/dashboard");
      expect(resolveLogoHomePath(loggedInUser, "/prepare/env_1")).toBe("/dashboard");
    });

    it("sends admin console users to /admin", () => {
      expect(resolveLogoHomePath(adminUser, "/admin/users")).toBe("/admin");
    });
  });
});