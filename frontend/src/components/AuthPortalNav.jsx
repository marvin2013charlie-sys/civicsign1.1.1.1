import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAuthNext, nextQueryString, persistAuthNext } from "@/lib/authPortal";

const TABS = [
  { key: "login", label: "Sign in", to: "/login" },
  { key: "register", label: "Create account", to: "/register" },
];

/** Tab bar linking sign-in and registration while preserving a post-auth redirect. */
export function AuthPortalNav({ active }) {
  const [params] = useSearchParams();
  const next = getAuthNext(params);

  React.useEffect(() => {
    if (params.get("next")) persistAuthNext(params.get("next"));
  }, [params]);

  const suffix = nextQueryString(next);

  return (
    <nav
      className="cs-auth-tabs"
      aria-label="Account access"
      data-testid="auth-portal-nav"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            to={`${tab.to}${suffix}`}
            className={`cs-auth-tab ${isActive ? "cs-auth-tab-active" : ""}`}
            data-testid={`auth-portal-tab-${tab.key}`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}