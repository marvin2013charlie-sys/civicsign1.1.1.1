/**
 * Contextual in-body links from supporting money pages to /uk-e-signature-software.
 * Plain JS so the React pages (via MarketingMoneyPage `categoryLink`) and
 * scripts/generate-page-seo.mjs (pre-rendered HTML) render the same sentence.
 * Anchor text is deliberately varied per page.
 */
export const UK_ESIGN_CONTEXT_LINKS = {
  "/": {
    before: "Comparing providers? Our ",
    anchor: "UK e-signature software guide",
    after: " puts CivicSign, Legalesign, Signable, MySign, eSign, DocuSign and Adobe side by side on GBP pricing, free plans and signature levels.",
  },
  "/docusign-alternative": {
    before: "Not sure a DocuSign-style suite is even the right shortlist? Start with our ",
    anchor: "UK e-signature software comparison",
    after: " — CivicSign, Legalesign, Signable, MySign, eSign, DocuSign and Adobe side by side on GBP pricing, signature levels and UK law.",
  },
  "/legalesign-alternative": {
    before: "Legalesign is one of several UK-based options. See how it stacks up against CivicSign, Signable, MySign and eSign in our ",
    anchor: "guide to the best UK e-signature software",
    after: ", with prices checked on each vendor's own site.",
  },
  "/signable-alternative": {
    before: "Weighing Signable's per-envelope plans against per-user and flat pricing? Our ",
    anchor: "e-signature software UK comparison",
    after: " lays out entry prices, free options and signature levels in one table.",
  },
  "/esign-alternative": {
    before: "eSign leads on advanced signatures; CivicSign on a free plan and built-in PDF tools. For the full picture, read ",
    anchor: "how to choose UK e-signature software",
    after: ", including a ten-point buyer's checklist.",
  },
  "/mysign-alternative": {
    before: "MySign sells flat plans; CivicSign pairs a free tier with per-user Pro. Compare both with Legalesign, Signable and eSign on our ",
    anchor: "UK e-signature software page",
    after: ".",
  },
  "/adobe-sign-alternative": {
    before: "If you only need to send and sign, not a full Acrobat licence per seat, see ",
    anchor: "UK e-signature software options compared",
    after: ", with GBP pricing and signature levels for each vendor.",
  },
  "/eidas-compliant-esignature": {
    before: "Once you know which signature level you need, check which vendors actually offer it in our ",
    anchor: "UK e-signature software buyer's guide",
    after: ".",
  },
  "/electronic-signatures-uk": {
    before: "Ready to pick a tool? Our ",
    anchor: "UK e-signature software comparison for 2026",
    after: " turns the law on this page into a practical shortlist.",
  },
  "/e-signature-for-solicitors-uk": {
    before: "Firms that need witnessing, QES or HM Land Registry conveyancer-certified signing should compare specialist providers too. See our ",
    anchor: "comparison of e-signature software in the UK",
    after: " for who offers what.",
  },
  "/e-signature-for-estate-agents-uk": {
    before: "Pricing tenancy and sales paperwork across tools? Our round-up of the ",
    anchor: "best e-signature software for UK businesses",
    after: " compares per-user, per-envelope and flat plans.",
  },
  "/e-signature-for-accountants-uk": {
    before: "For a wider view beyond practice-software add-ons, see our ",
    anchor: "UK e-signature software guide",
    after: " covering GBP pricing, audit trails and signature levels.",
  },
  "/e-signature-for-hr-uk": {
    before: "Comparing HR signing tools on cost per offer letter? Our ",
    anchor: "e-signature software for UK teams, compared",
    after: " covers per-user, per-envelope and flat pricing models.",
  },
};
