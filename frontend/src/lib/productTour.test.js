import {
  consumeTourPending,
  hasAutoTourBeenOffered,
  markAutoTourOffered,
  peekTourPending,
  requestProductTour,
} from "./productTour";

describe("productTour auto-start", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("queues a pending tour for the current session and user", () => {
    requestProductTour("app", "user_abc");
    expect(peekTourPending("app", "user_abc")).toBe(true);
    expect(peekTourPending("app", "user_other")).toBe(true);
  });

  it("consumes pending only when explicitly cleared", () => {
    requestProductTour("app", "user_abc");
    expect(consumeTourPending("app", "user_abc")).toBe(true);
    expect(peekTourPending("app", "user_abc")).toBe(false);
  });

  it("persists pending per user across sessions", () => {
    requestProductTour("app", "user_abc");
    sessionStorage.clear();
    expect(peekTourPending("app", "user_abc")).toBe(true);
  });

  it("marks auto tour as offered so it does not auto-start again", () => {
    requestProductTour("app", "user_abc");
    markAutoTourOffered("user_abc", "app");
    expect(hasAutoTourBeenOffered("user_abc", "app")).toBe(true);
    expect(peekTourPending("app", "user_abc")).toBe(true);
  });
});