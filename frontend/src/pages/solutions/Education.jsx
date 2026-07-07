import React from "react";
import {
  GraduationCap, ShieldCheck, Clock, CheckCircle2, Landmark,
  BookOpen, FileSignature, ScrollText, UserCheck, FileText, Sparkles,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";
import { BrandAccent } from "@/components/BrandText";

export default function Education() {
  return (
    <SolutionPageLayout
      testidSlug="education"
      industry="Solutions · Education"
      IndustryIcon={GraduationCap}
      headline={<>Parental consent and staff contracts, <BrandAccent>back before the bell rings.</BrandAccent></>}
      subhead="Built for UK schools, multi-academy trusts, FE colleges and independent providers. Capture parental consent forms, staff contracts, safeguarding declarations and supplier agreements, DfE and Keeping Children Safe in Education aligned."
      heroImage={{
        src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6",
        alt: "UK school administrator reviewing signed parental consent forms",
      }}
      stats={[
        { value: "< 24 hrs", label: "Average parental-consent turnaround" },
        { value: "0 paper", label: "Lost trip permission slips" },
        { value: "MAT-ready", label: "Roll out across every school in your trust" },
      ]}
      whyHeadline="Why UK education leaders trust CivicSign"
      whySubhead="Designed around Keeping Children Safe in Education (KCSIE), DfE data-protection guidance and the paperwork load of UK schools."
      why={[
        { icon: Clock, title: "Permission slips that do not live in a backpack", body: "Send the trip consent form by email, parents sign in 30 seconds, your office knows exactly who is coming." },
        { icon: ShieldCheck, title: "UK GDPR and child data strict", body: "Pupil and family data processed under UK GDPR with age-appropriate consent rules. Role-based access for SLT, DSL and admin." },
        { icon: CheckCircle2, title: "KCSIE and DfE aligned", body: "Audit trail evidences single central record entries, safeguarding declarations and policy acknowledgements, Ofsted-ready." },
        { icon: Sparkles, title: "Your school, your branding", body: "Add your school crest, colours and signing-page banner so families recognise communications instantly." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "DfE · digital records for schools" },
        headline: "DfE: digital records satisfy single central record requirements.",
        body: "The DfE's guidance for schools confirms that the single central record (SCR) can be maintained digitally, provided it captures every required field with a clear audit trail. CivicSign gives you signed staff DBS declarations, safeguarding training acknowledgements and policy attestations, all timestamped and instantly retrievable for an Ofsted or DfE inspection.",
      }}
      docsHeadline="Every school document, signed in minutes"
      docsSubhead="From parental consent to staff onboarding, paperless, audited and MAT-scalable."
      docs={[
        { icon: UserCheck, title: "Parental consent and trip permission", body: "Trip consents, photo and video permissions, medical authorisations, back signed before the closing date." },
        { icon: BookOpen, title: "Home–school agreements", body: "Capture annual home–school agreement signatures from every family in one bulk send. Renew with one click." },
        { icon: ScrollText, title: "Staff contracts and onboarding", body: "Teaching and support staff contracts, probation and variation letters, sequential signing for SLT approvals." },
        { icon: ShieldCheck, title: "Safeguarding and SCR declarations", body: "Annual safeguarding declarations, KCSIE acknowledgements and DBS attestations, Ofsted-ready audit trail." },
        { icon: FileSignature, title: "Supply and supplier agreements", body: "Onboard supply teachers, peripatetic staff and suppliers with terms, code of conduct and DBS confirmation in one flow." },
        { icon: FileText, title: "Pupil premium and SEN consents", body: "Capture parental consent for EHC plans, pupil-premium assessments and outside-agency referrals." },
      ]}
      ctaHeadline="Ready to give your school office its Friday afternoon back?"
      ctaSubhead="Stop the printer jams. Start collecting consent that arrives signed. Free for 5 documents a month, MAT discounts available."
      ctaButton="Start free for schools"
    />
  );
}