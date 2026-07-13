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
} from "lucide-react";

/** Grouped industry links for the main-site Solutions menu. */
export const SOLUTION_GROUPS = [
  {
    label: "Property & construction",
    items: [
      {
        to: "/solutions/real-estate",
        label: "Real Estate",
        icon: Home,
        blurb: "ASTs, sales memos and statutory notices — close lets without the printer",
      },
      {
        to: "/solutions/construction",
        label: "Construction & Trades",
        icon: HardHat,
        blurb: "Quotes, JCT contracts and RAMS — signed from the van",
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
        blurb: "Proposals, MSAs and order forms — close deals the same day",
      },
      {
        to: "/solutions/freelancers",
        label: "Freelancers",
        icon: PenLine,
        blurb: "SOWs, IP assignments and client contracts — sign in a tap",
      },
      {
        to: "/solutions/legal",
        label: "Legal & Solicitors",
        icon: Scale,
        blurb: "Engagement letters, NDAs and witnessed deeds — SRA-ready",
      },
      {
        to: "/solutions/financial-services",
        label: "Financial Services",
        icon: PoundSterling,
        blurb: "Engagement letters, AML forms and 64-8 authorities",
      },
      {
        to: "/solutions/staffing-agency",
        label: "Staffing Agencies",
        icon: Users,
        blurb: "Placement contracts, RTW checks and client terms",
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
        blurb: "Offer letters, RTW packs and leaver settlements",
      },
      {
        to: "/solutions/healthcare",
        label: "Healthcare",
        icon: HeartPulse,
        blurb: "Patient consent, care plans and staff compliance",
      },
      {
        to: "/solutions/education",
        label: "Education",
        icon: GraduationCap,
        blurb: "Trip consent, SCR declarations and staff onboarding",
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
        blurb: "Gift Aid, trustee resolutions and volunteer packs",
      },
    ],
  },
];

export const ALL_SOLUTIONS = SOLUTION_GROUPS.flatMap((g) => g.items);

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