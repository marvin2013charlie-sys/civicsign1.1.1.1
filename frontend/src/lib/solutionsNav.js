import {
  Home,
  Users,
  Scale,
  UsersRound,
  PoundSterling,
  HeartPulse,
  Heart,
  HardHat,
  GraduationCap,
  Briefcase,
  PenLine,
  Lock,
} from "lucide-react";

/** Soft icon chip backgrounds for the Solutions mega-menu (matches design). */
const CHIP = {
  teal: { bg: "#E0F7F4", fg: "#0F766E" },
  sand: { bg: "#FEF3C7", fg: "#B45309" },
  mint: { bg: "#D1FAE5", fg: "#047857" },
  coral: { bg: "#FFE4E6", fg: "#BE123C" },
  sky: { bg: "#E0F2FE", fg: "#0369A1" },
  lilac: { bg: "#EDE9FE", fg: "#6D28D9" },
  peach: { bg: "#FFEDD5", fg: "#C2410C" },
  sage: { bg: "#ECFDF5", fg: "#065F46" },
  blush: { bg: "#FCE7F3", fg: "#9D174D" },
  cream: { bg: "#FEF9C3", fg: "#A16207" },
};

/**
 * Industry solutions — `shortBlurb` powers the header mega-menu;
 * longer `blurb` is used on solution pages and related cards.
 */
export const SOLUTION_GROUPS = [
  {
    label: "Property & construction",
    items: [
      {
        to: "/solutions/real-estate",
        label: "Real Estate",
        icon: Home,
        shortBlurb: "Tenancy & sale agreements",
        blurb: "ASTs, sales memos and statutory notices — close lets without the printer",
        chip: CHIP.teal,
      },
      {
        to: "/solutions/construction",
        label: "Construction & Trades",
        icon: HardHat,
        shortBlurb: "Contracts & sign-offs",
        blurb: "Quotes, JCT contracts and RAMS — signed from the van",
        chip: CHIP.sand,
      },
    ],
  },
  {
    label: "Professional services",
    items: [
      {
        to: "/solutions/sales",
        label: "Sales Teams",
        icon: Briefcase,
        shortBlurb: "Close deals faster",
        blurb: "Proposals, MSAs and order forms — close deals the same day",
        chip: CHIP.sky,
      },
      {
        to: "/solutions/freelancers",
        label: "Freelancers",
        icon: PenLine,
        shortBlurb: "Scope & invoice terms",
        blurb: "SOWs, IP assignments and client contracts — sign in a tap",
        chip: CHIP.coral,
      },
      {
        to: "/solutions/legal",
        label: "Legal & Solicitors",
        icon: Scale,
        shortBlurb: "Court-ready audit trails",
        blurb: "Engagement letters, NDAs and witnessed deeds — SRA-ready",
        chip: CHIP.mint,
        featured: true,
        featuredBody:
          "Court-ready audit trails and tamper-evident SHA-256 sealing on every signed document.",
      },
      {
        to: "/solutions/financial-services",
        label: "Financial Services",
        icon: PoundSterling,
        shortBlurb: "KYC & onboarding",
        blurb: "Engagement letters, AML forms and 64-8 authorities",
        chip: CHIP.sage,
      },
      {
        to: "/solutions/staffing-agency",
        label: "Staffing Agencies",
        icon: Users,
        shortBlurb: "Offers & compliance",
        blurb: "Placement contracts, RTW checks and client terms",
        chip: CHIP.sky,
      },
    ],
  },
  {
    label: "People & care",
    items: [
      {
        to: "/solutions/hr",
        label: "HR & People Ops",
        icon: UsersRound,
        shortBlurb: "Onboarding paperwork",
        blurb: "Offer letters, RTW packs and leaver settlements",
        chip: CHIP.peach,
      },
      {
        to: "/solutions/healthcare",
        label: "Healthcare",
        icon: HeartPulse,
        shortBlurb: "Consent & intake forms",
        blurb: "Patient consent, care plans and staff compliance",
        chip: CHIP.blush,
      },
      {
        to: "/solutions/education",
        label: "Education",
        icon: GraduationCap,
        shortBlurb: "Enrolment & consent",
        blurb: "Trip consent, SCR declarations and staff onboarding",
        chip: CHIP.cream,
      },
    ],
  },
  {
    label: "Non-profits",
    items: [
      {
        to: "/solutions/charities",
        label: "Charities",
        icon: Heart,
        shortBlurb: "Gift Aid & trustee packs",
        blurb: "Gift Aid, trustee resolutions and volunteer packs",
        chip: CHIP.lilac,
      },
    ],
  },
];

export const ALL_SOLUTIONS = SOLUTION_GROUPS.flatMap((g) => g.items);

/**
 * Order for the header mega-menu grid (matches product design screenshot).
 * Charities remains available via View all / Solutions page.
 */
export const NAV_MENU_SOLUTIONS = [
  "Real Estate",
  "Construction & Trades",
  "Sales Teams",
  "Freelancers",
  "Legal & Solicitors",
  "Financial Services",
  "Staffing Agencies",
  "HR & People Ops",
  "Healthcare",
  "Education",
]
  .map((label) => ALL_SOLUTIONS.find((s) => s.label === label))
  .filter(Boolean);

export const FEATURED_SOLUTION =
  ALL_SOLUTIONS.find((s) => s.featured) || ALL_SOLUTIONS.find((s) => s.to === "/solutions/legal");

export const FEATURED_TRUST = {
  icon: Lock,
  title: "UK GDPR compliant",
  body: "Legally binding under UK law",
};

const GROUP_BADGE_BG = [
  "var(--badge-teal-bg)",
  "var(--badge-coral-bg)",
  "var(--badge-warning-bg)",
  "var(--badge-teal-bg)",
];

export function solutionGroupBadgeBg(index) {
  return GROUP_BADGE_BG[index % GROUP_BADGE_BG.length];
}

export function getSolutionGroupForPath(path) {
  return SOLUTION_GROUPS.find((g) => g.items.some((i) => i.to === path)) || null;
}

export function getRelatedSolutions(currentPath, limit = 3) {
  const group = getSolutionGroupForPath(currentPath);
  const pool = group
    ? group.items.filter((i) => i.to !== currentPath)
    : ALL_SOLUTIONS.filter((i) => i.to !== currentPath);
  return pool.slice(0, limit);
}

export function solutionTestId(label) {
  return `nav-solution-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}
