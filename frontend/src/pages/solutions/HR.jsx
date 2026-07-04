import React from "react";
import {
  Users, ShieldCheck, Clock, CheckCircle2, Briefcase,
  FileSignature, ScrollText, UserPlus, FileText, Sparkles, Landmark,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";

export default function HR() {
  return (
    <SolutionPageLayout
      testidSlug="hr"
      industry="Solutions · HR & People Ops"
      IndustryIcon={Users}
      headline={<>Onboard new starters <span style={{ color: "var(--c-primary)" }}>before their first coffee.</span></>}
      subhead="Built for UK HR teams. Send offer letters, employment contracts, Right to Work declarations and leaver paperwork — all with the audit trail an Employment Tribunal will accept."
      heroImage={{
        src: "https://images.unsplash.com/photo-1521737711867-e3b97375f902",
        alt: "UK new starter signing employment contract on tablet",
      }}
      stats={[
        { value: "< 3 hrs", label: "Offer-letter signature time" },
        { value: "0 paper", label: "RTW packs lost in the post" },
        { value: "100%", label: "UK GDPR by default" },
      ]}
      whyHeadline="Why UK HR teams pick CivicSign"
      whySubhead="Built for the way British HR actually works — UK GDPR, ACAS guidance, and the unique pain of chasing wet signatures across hybrid offices."
      why={[
        { icon: Clock, title: "Cut offer-to-start time in half", body: "Send the offer letter from the interview room. Counter-signed contract back in hours — start dates land earlier, attrition drops." },
        { icon: ShieldCheck, title: "ICO & UK GDPR aligned", body: "Candidate data (DOB, address, NI number) is processed under UK GDPR. Access roles separate HR from line managers." },
        { icon: CheckCircle2, title: "Employment Tribunal ready", body: "Aligned with the Electronic Communications Act 2000 and UK eIDAS. Audit trail evidences receipt, view and signature." },
        { icon: Sparkles, title: "Your employer brand, end-to-end", body: "Add your logo, colours and signing-page banner so candidates feel like they're already inside the company." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "Home Office · digital Right to Work checks" },
        headline: "Right to Work declarations, captured at speed — Home Office aligned.",
        body: "Since 2022 the Home Office has accepted digital identity verification for Right to Work checks via certified Identity Service Providers. CivicSign gives you the timestamped declaration, IP and audit trail you need alongside that check — so your statutory excuse stands up under inspection.",
      }}
      docsHeadline="Every HR document, signed in minutes"
      docsSubhead="Save your contract pack as a template — every new starter, in one click."
      docs={[
        { icon: Briefcase,     title: "Offer letters & employment contracts", body: "Send permanent, fixed-term and zero-hours contracts with start date, salary and signature fields pre-placed." },
        { icon: FileSignature, title: "Right to Work declarations", body: "Capture RTW declarations alongside ID-check evidence, timestamped and stored against the employee record." },
        { icon: UserPlus,      title: "Probation reviews & confirmations", body: "Confirm probation outcomes electronically — auto-route to line manager, HR and the employee." },
        { icon: FileText,      title: "Variation letters & promotion notices", body: "Change of role, salary uplift, hours adjustment — signed and filed without printing a single page." },
        { icon: ScrollText,    title: "Leaver paperwork & settlement", body: "Resignation acknowledgements, COT3s and settlement agreements signed sequentially: employee → solicitor → employer." },
        { icon: ShieldCheck,   title: "Confidentiality & restrictive covenants", body: "Capture post-termination undertakings — defensible if you ever need to enforce a non-compete." },
      ]}
      ctaHeadline="Ready to give every new starter the welcome they deserve?"
      ctaSubhead="No more chasing the photocopier on a Monday morning. Get your contract pack signing itself, free for 5 documents a month."
      ctaButton="Start free for HR teams"
    />
  );
}
