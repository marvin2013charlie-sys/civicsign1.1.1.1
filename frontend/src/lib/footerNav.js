import { LEGAL_LINKS } from "@/lib/legalLinks";
import { FOOTER_RESOURCE_LINKS } from "@/lib/resourcesNav";

export const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "UK e-signature software", to: "/uk-e-signature-software" },
      { label: "Manage PDF", to: "/product/manage-pdf" },
      { label: "Features", to: { pathname: "/", hash: "#features" } },
      { label: "ID verification", to: "/product/id-verification", badge: "Coming soon" },
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