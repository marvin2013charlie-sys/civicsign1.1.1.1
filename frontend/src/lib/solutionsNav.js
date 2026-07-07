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
        blurb: "ASTs, sales memos and statutory notices",
      },
      {
        to: "/solutions/construction",
        label: "Construction & Trades",
        icon: HardHat,
        blurb: "Quotes, JCT contracts and RAMS sign-off",
      },
    ],
  },
  {
    label: "Professional services",
    items: [
      {
        to: "/solutions/legal",
        label: "Legal & Solicitors",
        icon: Scale,
        blurb: "Engagement letters and witnessed deeds",
      },
      {
        to: "/solutions/financial-services",
        label: "Financial Services",
        icon: PoundSterling,
        blurb: "Engagement letters and AML declarations",
      },
      {
        to: "/solutions/staffing-agency",
        label: "Staffing Agencies",
        icon: Users,
        blurb: "Contracts, Right to Work and client terms",
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
        blurb: "Offer letters, contracts and leaver packs",
      },
      {
        to: "/solutions/healthcare",
        label: "Healthcare",
        icon: HeartPulse,
        blurb: "Patient consent and care-plan signatures",
      },
      {
        to: "/solutions/education",
        label: "Education",
        icon: GraduationCap,
        blurb: "Parental consent and staff onboarding",
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
        blurb: "Gift Aid, trustee resolutions and volunteers",
      },
    ],
  },
];

export const ALL_SOLUTIONS = SOLUTION_GROUPS.flatMap((g) => g.items);

export function solutionTestId(label) {
  return `nav-solution-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}