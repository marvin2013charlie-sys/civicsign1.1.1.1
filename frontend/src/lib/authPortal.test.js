import { getAppHomePath, getPostAuthDestination, sanitizeNextUrl } from "./authPortal";

describe("authPortal", () => {
  describe("sanitizeNextUrl", () => {
    it("rejects marketing home and auth loops", () => {
      expect(sanitizeNextUrl("/")).toBeNull();
      expect(sanitizeNextUrl("/login")).toBeNull();
      expect(sanitizeNextUrl("/register")).toBeNull();
      expect(sanitizeNextUrl("//evil.com")).toBeNull();
    });

    it("allows in-app destinations", () => {
      expect(sanitizeNextUrl("/dashboard")).toBe("/dashboard");
      expect(sanitizeNextUrl("/settings?tab=subscription")).toBe("/settings?tab=subscription");
    });
  });

  describe("getAppHomePath", () => {
    it("routes internal team to admin and customers to dashboard", () => {
      expect(getAppHomePath({ role: "user" })).toBe("/dashboard");
      expect(getAppHomePath({ role: "staff" })).toBe("/admin");
      expect(getAppHomePath({ role: "admin" })).toBe("/admin");
      expect(getAppHomePath(false)).toBe("/login");
    });
  });

  describe("getPostAuthDestination", () => {
    it("defaults to dashboard when next is missing or landing", () => {
      expect(getPostAuthDestination(null)).toBe("/dashboard");
      expect(getPostAuthDestination("/")).toBe("/dashboard");
      expect(getPostAuthDestination("")).toBe("/dashboard");
    });

    it("uses role-aware home when user is provided", () => {
      expect(getPostAuthDestination(null, { role: "staff" })).toBe("/admin");
      expect(getPostAuthDestination(null, { role: "user" })).toBe("/dashboard");
    });

    it("honours safe in-app next paths", () => {
      expect(getPostAuthDestination("/usage")).toBe("/usage");
    });
  });
});