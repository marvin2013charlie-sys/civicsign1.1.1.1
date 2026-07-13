jest.mock("@/lib/appOrigin", () => ({
  getAppOrigin: () => "http://localhost:3000",
}));

import {
  isSafeExternalHref,
  isSafeSignRedirect,
  isSafeStripeRedirect,
} from "./safeUrl";

describe("safeUrl", () => {
  it("blocks javascript URLs", () => {
    expect(isSafeExternalHref("javascript:alert(1)")).toBe(false);
  });

  it("allows https external links", () => {
    expect(isSafeExternalHref("https://example.com/path")).toBe(true);
  });

  it("allows relative paths", () => {
    expect(isSafeExternalHref("/blog/post")).toBe(true);
  });

  it("validates sign redirects on app origin", () => {
    expect(isSafeSignRedirect("http://localhost:3000/sign/abc123def4567890")).toBe(true);
    expect(isSafeSignRedirect("https://evil.example/sign/abc")).toBe(false);
  });

  it("validates stripe checkout hosts", () => {
    expect(isSafeStripeRedirect("https://checkout.stripe.com/c/pay/cs_test_abc")).toBe(true);
    expect(isSafeStripeRedirect("https://evil.com/pay")).toBe(false);
  });
});