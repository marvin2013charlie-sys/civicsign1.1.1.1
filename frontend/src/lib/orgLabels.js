/** Customer-facing labels for organisation accounts (backend still uses org_role: owner). */
export function formatOrgRole(role) {
  if (role === "owner") return "Admin";
  if (role === "member") return "Member";
  if (!role) return "Member";
  return String(role).charAt(0).toUpperCase() + String(role).slice(1);
}