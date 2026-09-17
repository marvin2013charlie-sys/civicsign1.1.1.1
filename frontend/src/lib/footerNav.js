import { LEGAL_LINKS } from "@/lib/legalLinks";
import { FOOTER_RESOURCE_LINKS } from "@/lib/resourcesNav";

export const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "Manage PDF", to: "/product/manage-pdf" },
      { label: "ID verification", to: "/product/id-verification", badge: "Coming soon" },
      { label: "UK e-signature", to: "/uk-e-signature-software" },
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