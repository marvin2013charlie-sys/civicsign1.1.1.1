import React from "react";
import {
  UsersRound, ShieldCheck, Clock, CheckCircle2, Briefcase,
  FileSignature, ScrollText, UserPlus, FileText, Sparkles, Landmark,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";
import { BrandAccent } from "@/components/BrandText";

export default function HR() {
  return (
    <SolutionPageLayout
      testidSlug="hr"
      industry="Solutions · HR & People Ops"
      IndustryIcon={UsersRound}
      headline={<>Onboard new starters <BrandAccent>before their first coffee.</BrandAccent></>}
      subhead="Built for UK HR teams. Send offer letters, employment contracts, Right to Work declarations and leaver paperwork, all with an audit trail an Employment Tribunal will accept."
      heroImage={{
        src: "https://images.unsplash.com/photo-1521737711867-e3b97375f902",
        alt: "UK new starter signing employment contract on tablet",
      }}
      stats={[
        { value: "< 3 hrs", label: "Average offer-letter signature time" },
        { value: "0 paper", label: "Right to Work packs lost in the post" },
        { value: "100%", label: "UK GDPR by default" },
      ]}
      whyHeadline="Why UK HR teams pick CivicSign"
      whySubhead="Built for the way British HR actually works, UK GDPR, ACAS guidance and the pain of chasing wet signatures across hybrid offices."
      why={[
        { icon: Clock, title: "Cut offer-to-start time in half", body: "Send the offer letter from the interview room. Counter-signed contract back in hours, start dates land earlier, attrition drops." },
        { icon: ShieldCheck, title: "ICO and UK GDPR aligned", body: "Candidate data (date of birth, address, NI number) is processed under UK GDPR. Access roles separate HR from line managers." },
        { icon: CheckCircle2, title: "Employment Tribunal ready", body: "Aligned with the Electronic Communications Act 2000 and UK eIDAS. Audit trail evidences receipt, view and signature." },
        { icon: Sparkles, title: "Your employer brand, end-to-end", body: "Add your logo, colours and signing-page banner so candidates feel like they are already inside the company." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "Home Office · digital Right to Work checks" },
        headline: "Right to Work declarations, captured at speed, Home Office aligned.",
        body: "Since 2022 the Home Office has accepted digital identity verification for Right to Work checks via certified Identity Service Providers. CivicSign gives you the timestamped declaration, IP address and audit trail you need alongside that check, so your statutory excuse stands up under inspection.",
      }}
      docsHeadline="Every HR document, signed in minutes"
      docsSubhead="Save your contract pack as a template, every new starter, in one click."
      docs={[
        { icon: Briefcase, title: "Offer letters and employment contracts", body: "Send permanent, fixed-term and zero-hours contracts with start date, salary and signature fields pre-placed." },
        { icon: FileSignature, title: "Right to Work declarations", body: "Capture RTW declarations alongside ID-check evidence, timestamped and stored against the employee record." },
        { icon: UserPlus, title: "Probation reviews and confirmations", body: "Confirm probation outcomes electronically, auto-route to line manager, HR and the employee." },
        { icon: FileText, title: "Variation letters and promotion notices", body: "Change of role, salary uplift or hours adjustment, signed and filed without printing a single page." },
        { icon: ScrollText, title: "Leaver paperwork and settlement", body: "Resignation acknowledgements, COT3s and settlement agreements signed sequentially: employee, solicitor, employer." },
        { icon: ShieldCheck, title: "Confidentiality and restrictive covenants", body: "Capture post-termination undertakings, defensible if you ever need to enforce a non-compete." },
      ]}
      ctaHeadline="Ready to give every new starter the welcome they deserve?"
      ctaSubhead="No more chasing the photocopier on a Monday morning. Get your contract pack signing itself, free for 2 documents a month."
      ctaButton="Start free for HR teams"
    />
  );
}