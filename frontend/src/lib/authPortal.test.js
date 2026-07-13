import { getPostAuthDestination, sanitizeNextUrl } from "./authPortal";

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

  describe("getPostAuthDestination", () => {
    it("defaults to dashboard when next is missing or landing", () => {
      expect(getPostAuthDestination(null)).toBe("/dashboard");
      expect(getPostAuthDestination("/")).toBe("/dashboard");
      expect(getPostAuthDestination("")).toBe("/dashboard");
    });

    it("honours safe in-app next paths", () => {
      expect(getPostAuthDestination("/usage")).toBe("/usage");
    });
  });
});