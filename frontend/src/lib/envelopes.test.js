import {
  normalizeEnvelopeStatusFilter,
  envelopeFilterPath,
  envelopeStatusToDashboardFilter,
} from "./envelopeFilters";

describe("envelope dashboard filters", () => {
  it("normalizes known status filters", () => {
    expect(normalizeEnvelopeStatusFilter("awaiting")).toBe("awaiting");
    expect(normalizeEnvelopeStatusFilter("completed")).toBe("completed");
    expect(normalizeEnvelopeStatusFilter("draft")).toBe("draft");
    expect(normalizeEnvelopeStatusFilter("declined")).toBe("declined");
    expect(normalizeEnvelopeStatusFilter("all")).toBe("all");
  });

  it("falls back to all for unknown filters", () => {
    expect(normalizeEnvelopeStatusFilter("sent")).toBe("all");
    expect(normalizeEnvelopeStatusFilter(null)).toBe("all");
    expect(normalizeEnvelopeStatusFilter("")).toBe("all");
  });

  it("builds dashboard deep links", () => {
    expect(envelopeFilterPath("all")).toBe("/dashboard");
    expect(envelopeFilterPath("awaiting")).toBe("/dashboard?status=awaiting");
    expect(envelopeFilterPath("bogus")).toBe("/dashboard");
  });

  it("maps raw status keys to dashboard filters", () => {
    expect(envelopeStatusToDashboardFilter("draft")).toBe("draft");
    expect(envelopeStatusToDashboardFilter("sent")).toBe("awaiting");
    expect(envelopeStatusToDashboardFilter("viewed")).toBe("awaiting");
    expect(envelopeStatusToDashboardFilter("completed")).toBe("completed");
    expect(envelopeStatusToDashboardFilter("declined")).toBe("declined");
  });
});