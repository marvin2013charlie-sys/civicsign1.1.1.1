import { LEGAL_LINKS } from "@/lib/legalLinks";
import { FOOTER_RESOURCE_LINKS } from "@/lib/resourcesNav";

export const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "UK e-signature software", to: "/uk-e-signature-software" },
      { label: "Legalesign alternative", to: "/legalesign-alternative" },
      { label: "Signable alternative", to: "/signable-alternative" },
      { label: "eSign alternative", to: "/esign-alternative" },
      { label: "MySign alternative", to: "/mysign-alternative" },
      { label: "DocuSign alternative", to: "/docusign-alternative" },
      { label: "Adobe Sign alternative", to: "/adobe-sign-alternative" },
      { label: "eIDAS e-signature", to: "/eidas-compliant-esignature" },
      { label: "E-signature for solicitors", to: "/e-signature-for-solicitors-uk" },
      { label: "E-signature for estate agents", to: "/e-signature-for-estate-agents-uk" },
      { label: "Features", to: { pathname: "/", hash: "#features" } },
      { label: "Manage PDF", to: "/product/manage-pdf" },
      { label: "ID verification", to: "/product/id-verification", badge: "Coming soon" },
      { label: "Solutions", to: "/solutions" },
      { label: "How it works", to: { pathname: "/", hash: "#how" } },
      { label: "Security", to: { pathname: "/", hash: "#security" } },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: FOOTER_RESOURCE_LINKS,
  },
  {
    title: "Company",
    links: [
      { label: "About us", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Contact us", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: LEGAL_LINKS.map((item) => ({ label: item.label, to: item.to })),
  },
];