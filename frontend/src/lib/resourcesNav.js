import { BookOpen, CircleHelp, LifeBuoy } from "lucide-react";

/** Shared resource links for site footer. */
export const RESOURCE_LINKS = [
  { to: "/blog", label: "Blog", icon: BookOpen, blurb: "UK e-signature law, product updates and customer stories" },
  { to: { pathname: "/", hash: "#faq" }, label: "FAQ", icon: CircleHelp, blurb: "Answers on legality, security and billing" },
  { to: "/contact", label: "Help & support", icon: LifeBuoy, blurb: "Questions about pricing, partnerships or your account" },
];

/** Footer uses plain label + to only. */
export const FOOTER_RESOURCE_LINKS = RESOURCE_LINKS.map(({ to, label }) => ({ to, label }));