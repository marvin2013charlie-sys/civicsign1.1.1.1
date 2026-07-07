import { extractApiDetail, formatApiError } from "./apiErrors";

describe("extractApiDetail", () => {
  it("unwraps axios response detail strings", () => {
    expect(extractApiDetail({ response: { data: { detail: "Not found" } } })).toBe("Not found");
  });

  it("returns validation error arrays", () => {
    const errors = [{ msg: "Invalid email" }];
    expect(extractApiDetail({ response: { data: { detail: errors } } })).toEqual(errors);
  });
});

describe("formatApiError", () => {
  it("returns a friendly default for nullish input", () => {
    expect(formatApiError(null)).toBe("Something went wrong. Please try again.");
  });

  it("returns plain string errors as-is", () => {
    expect(formatApiError("Session expired")).toBe("Session expired");
  });

  it("joins FastAPI validation messages", () => {
    expect(formatApiError([{ msg: "Field required" }, { msg: "Invalid format" }])).toBe(
      "Field required Invalid format",
    );
  });

  it("handles quota_exceeded objects", () => {
    expect(formatApiError({ code: "quota_exceeded", message: "Limit reached" })).toBe("Limit reached");
  });

  it("extracts nested axios error detail", () => {
    expect(formatApiError({ response: { data: { detail: "User not found" } } })).toBe("User not found");
  });
});