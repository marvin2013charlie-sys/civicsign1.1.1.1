import React from "react";
import { Link } from "react-router-dom";
import { Building2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatProMonthlyShort } from "@/lib/pricing";
import { useAuth } from "@/context/AuthContext";
import { isOrgStaff, ORG_STAFF_ESCALATION_NOTE } from "@/lib/orgLabels";

export function UpgradePrompt({ title, description, feature, tier = "pro" }) {
  const { user } = useAuth();
  const orgStaff = isOrgStaff(user);
  const isBusiness = tier === "business";
  const Icon = isBusiness ? Building2 : Crown;
  const cta = orgStaff
    ? "Contact your organisation admin"
    : isBusiness
      ? "Talk to our team, Business plan"
      : `Upgrade to Pro, ${formatProMonthlyShort()}`;
  const link = orgStaff ? "/organisation" : isBusiness ? "/contact" : "/settings?tab=subscription";
  const blurb = orgStaff ? ORG_STAFF_ESCALATION_NOTE : description;

  return (
    <div
      className="rounded-xl border border-dashed border-[var(--c-border)] bg-[var(--c-paper-2)] p-6 text-center"
      data-testid={feature ? `upgrade-prompt-${feature}` : "upgrade-prompt"}
    >
      <span
        className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: "var(--status-sent-bg)" }}
      >
        <Icon className="h-5 w-5" style={{ color: "var(--c-primary)" }} />
      </span>
      <h3 className="mt-3 font-heading text-lg font-semibold text-[var(--c-ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--c-muted-fg)]">{blurb}</p>
      <Link to={link} className="mt-4 inline-block">
        <Button
          data-testid={isBusiness ? "upgrade-to-business-button" : "upgrade-to-pro-button"}
          style={{ background: "var(--c-primary)", color: "#fff" }}
        >
          {cta}
        </Button>
      </Link>
    </div>
  );
}