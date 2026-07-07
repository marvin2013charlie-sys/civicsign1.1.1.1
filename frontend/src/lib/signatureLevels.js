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
      "UK eIDAS Art. 3(11). Typed, drawn or click-to-sign with full audit trail. Default for Pro.",
  },
  aes: {
    id: "aes",
    short: "Advanced Electronic Signature (AES)",
    badge: "AES",
    description:
      "UK eIDAS Art. 26. Uniquely linked to the signer, identifies them, under their sole control, with tamper detection. Default for Business.",
  },
  qes: {
    id: "qes",
    short: "Qualified Electronic Signature (QES)",
    badge: "QES",
    description:
      "UK eIDAS Art. 3(12). AES backed by a qualified certificate from a Qualified Trust Service Provider. Available on request for Business.",
    contactRequired: true,
  },
};

export function allowedSignatureLevels(features) {
  const levels = ["basic"];
  if (features?.ses_signatures) levels.push("ses");
  if (features?.aes_signatures) levels.push("aes");
  if (features?.qes_available) levels.push("qes");
  return levels;
}

export function defaultSignatureLevel(features) {
  if (features?.aes_signatures && features?.plan === "business") return "aes";
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