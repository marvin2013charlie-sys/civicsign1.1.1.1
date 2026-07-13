/* eslint-env jest */
import React from "react";
import { renderToString } from "react-dom/server";

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: false }),
}));

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/" }),
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders the CivicSign wordmark with an explicit public home link", () => {
    const html = renderToString(<Logo to="/" />);

    expect(html).toContain("CivicSign");
    expect(html).toContain('data-testid="brand-logo"');
    expect(html).toContain('data-testid="brand-logo-line"');
    expect(html).toContain('data-testid="brand-logo-dot"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="CivicSign home"');
  });

  it("supports dark variant for admin and auth panels", () => {
    const html = renderToString(<Logo dark to="/dashboard" />);

    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("#ffffff");
    expect(html).toContain('aria-label="CivicSign dashboard"');
  });
});