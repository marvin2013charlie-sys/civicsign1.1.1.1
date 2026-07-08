/* eslint-env jest */
import { copyToClipboard } from "./clipboard";

describe("copyToClipboard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns false for empty text", async () => {
    expect(await copyToClipboard("")).toBe(false);
    expect(await copyToClipboard(null)).toBe(false);
  });

  it("uses navigator.clipboard when available", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const ok = await copyToClipboard("hello");

    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when clipboard API fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    const execCommand = jest.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    const ok = await copyToClipboard("fallback");

    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});