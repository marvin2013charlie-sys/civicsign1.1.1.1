import React from "react";
import { cn } from "@/lib/utils";
import { formatQuotaRemainingLine } from "@/lib/quotaDisplay";

function QuotaRing({ usage }) {
  const pct = Math.min(100, usage.percent || 0);
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const isHigh = pct >= 90;

  return (
    <div
      className="cs-sidebar-quota-ring"
      data-testid="sidebar-quota-mini"
      title={`${usage.used} / ${usage.limit} envelopes used`}
      aria-label={`${usage.used} of ${usage.limit} envelopes used`}
    >
      <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90" aria-hidden>
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="rgba(248,247,242,.14)"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={isHigh ? "#FF7A5C" : "#2DD4BF"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      <span className="cs-sidebar-quota-ring-value">{usage.used}</span>
    </div>
  );
}

export function SidebarQuotaMini({ usage, collapsed = false }) {
  if (!usage || usage.unlimited || !usage.limit) return null;

  const pct = Math.min(100, usage.percent || 0);
  const isOrg = usage.scope === "organization";

  if (collapsed) {
    return (
      <div className="mb-2 flex justify-center px-2">
        <QuotaRing usage={usage} />
      </div>
    );
  }

  return (
    <div
      className="mx-4 mb-3 rounded-[14px] border p-3.5"
      style={{ background: "rgba(248,247,242,.06)", borderColor: "rgba(248,247,242,.1)" }}
      data-testid="sidebar-quota-mini"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-[1px]"
          style={{ color: "rgba(248,247,242,.6)" }}
        >
          {isOrg ? "Organisation" : `${usage.plan || "Free"} plan`}
        </span>
        <span className="text-[11.5px] font-semibold" style={{ color: "#2DD4BF" }}>
          {usage.used} / {usage.limit}
        </span>
      </div>
      <div
        className="mt-2 h-[5px] overflow-hidden rounded-[3px]"
        style={{ background: "rgba(248,247,242,.12)" }}
      >
        <div
          className={cn("h-full rounded-[3px] transition-all duration-300")}
          style={{ width: `${pct}%`, background: pct >= 90 ? "#FF7A5C" : "#2DD4BF" }}
        />
      </div>
      <div className="mt-1.5 text-[10.5px]" style={{ color: "rgba(248,247,242,.45)" }}>
        {formatQuotaRemainingLine(usage)}
      </div>
    </div>
  );
}