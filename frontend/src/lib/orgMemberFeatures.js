/** Feature toggles organisation admins can set per member at invite time. */

export const ORG_MEMBER_FEATURE_OPTIONS = [
  { key: "manage_pdf", label: "Manage PDF" },
  { key: "team_templates", label: "Shared templates" },
  { key: "bulk_send", label: "Bulk send" },
  { key: "comments", label: "Comments" },
  { key: "custom_branding", label: "Custom branding" },
  { key: "public_links", label: "Public links" },
  { key: "recipient_auth", label: "Signer authentication" },
  { key: "seal_verification", label: "Seal verification" },
];

export function defaultOrgMemberFeatureFlags() {
  return Object.fromEntries(ORG_MEMBER_FEATURE_OPTIONS.map((o) => [o.key, true]));
}