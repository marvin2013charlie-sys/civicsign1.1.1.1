/** UK eIDAS signature tiers, mirrors backend signature_levels.py */

export const SIGNATURE_LEVELS = {
  basic: {
    id: "basic",
    short: "Electronic signature",
    badge: null,
    description:
      "Consent, attribution, audit trail and SHA-256 seal. Suitable for everyday contracts on the Free plan.",
  },
  ses: {
    id: "ses",
    short: "Simple Electronic Signature (SES)",
    badge: "SES",
    description:
      "Typed or drawn electronic signature with consent and an audit trail.",
  },
  aes: {
    id: "aes",
    short: "Advanced Electronic Signature (AES)",
    badge: "AES",
    description:
      "Unavailable. Advanced signature assurance has not been implemented.",
  },
  qes: {
    id: "qes",
    short: "Qualified Electronic Signature (QES)",
    badge: "QES",
    description:
      "Unavailable. Qualified trust service integration has not been implemented.",
    contactRequired: true,
  },
};

export function allowedSignatureLevels(features) {
  const levels = ["basic"];
  if (features?.ses_signatures) levels.push("ses");
  return levels;
}

export function defaultSignatureLevel(features) {
  if (features?.ses_signatures) return "ses";
  return "basic";
}

export function signatureLevelOptions(features) {
  const allowed = allowedSignatureLevels(features);
  return allowed.map((id) => ({
    id,
    ...SIGNATURE_LEVELS[id],
    disabled: id === "qes" && !features?.qes_available,
  }));
}