import React from "react";

const MAP = {
  draft: { label: "Draft", v: "draft" },
  sent: { label: "Sent", v: "sent" },
  viewed: { label: "Viewed", v: "viewed" },
  completed: { label: "Completed", v: "completed" },
  declined: { label: "Declined", v: "declined" },
  expired: { label: "Expired", v: "expired" },
  signed: { label: "Signed", v: "completed" },
  pending: { label: "Pending", v: "draft" },
};

export const StatusBadge = ({ status, className = "" }) => {
  const m = MAP[status] || MAP.draft;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${className}`}
      style={{
        background: `var(--status-${m.v}-bg)`,
        color: `var(--status-${m.v}-fg)`,
        borderColor: `var(--status-${m.v}-border)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--status-${m.v}-border)` }} />
      {m.label}
    </span>
  );
};
