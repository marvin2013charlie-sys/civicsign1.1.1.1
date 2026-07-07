import React from "react";
import { renderToString } from "react-dom/server";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders the CivicSign wordmark and home link", () => {
    const html = renderToString(<Logo />);

    expect(html).toContain("CivicSign");
    expect(html).toContain('data-testid="brand-logo"');
    expect(html).toContain('href="/"');
  });

  it("supports custom link targets", () => {
    const html = renderToString(<Logo to="/admin" />);

    expect(html).toContain('href="/admin"');
  });
});