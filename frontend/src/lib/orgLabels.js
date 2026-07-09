/** Customer-facing labels for organisation accounts (backend still uses org_role: owner). */
export function formatOrgRole(role) {
  if (role === "owner") return "Admin";
  if (role === "member") return "Member";
  if (!role) return "Member";
  return String(role).charAt(0).toUpperCase() + String(role).slice(1);
}

/** True for organisation contract holders / team managers (org_role owner). */
export function isOrgOwner(user) {
  return user?.org_role === "owner";
}

export function isOrgStaff(user) {
  return Boolean(user?.org_id) && !isOrgOwner(user);
}

/** Org members must escalate via their organisation admin before CivicSign support. */
export const ORG_STAFF_ESCALATION_NOTE =
  "Contact your organisation admin first. They manage your account and can escalate to CivicSign if needed.";

export const ORG_STAFF_LIMIT_MESSAGE =
  "You've reached your monthly allowance. Contact your organisation admin if you need more capacity.";

export const ORG_STAFF_SEND_BLOCKED =
  "You cannot send more documents right now. Contact your organisation admin — they can resolve this with CivicSign if needed.";