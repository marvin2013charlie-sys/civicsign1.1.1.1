import React from "react";
import {
  Scale, ShieldCheck, Clock, CheckCircle2, Landmark,
  Gavel, FileSignature, ScrollText, BookOpen, Users, Sparkles,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";
import { BrandAccent } from "@/components/BrandText";

export default function Legal() {
  return (
    <SolutionPageLayout
      testidSlug="legal"
      industry="Solutions · Legal & Solicitors"
      IndustryIcon={Scale}
      headline={<>Sign engagement letters and deeds <BrandAccent>without breaking client privilege.</BrandAccent></>}
      subhead="Built for UK solicitors, barristers' chambers and in-house legal teams. Send NDAs, retainers, witnessed deeds and engagement letters in minutes, UK eIDAS aligned, ICO aligned and court-defensible."
      heroImage={{
        src: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9",
        alt: "UK solicitor reviewing signed engagement letter on laptop",
      }}
      stats={[
        { value: "< 1 hr", label: "Average engagement-letter turnaround" },
        { value: "Witness", label: "Sequential witness routing built in" },
        { value: "100%", label: "UK-owned and UK-hosted" },
      ]}
      whyHeadline="Why UK legal teams trust CivicSign"
      whySubhead="Designed around UK private practice, Law Society guidance, SRA confidentiality and the LSB's stance on electronic execution."
      why={[
        { icon: Clock, title: "Clients sign before they cool off", body: "Engagement letters sent in the morning are back signed before close of business, bill faster, write off less." },
        { icon: ShieldCheck, title: "SRA and ICO aligned", body: "Client data is processed under UK GDPR with role-based access. Every action carries an IP address and timestamp for SRA file audits." },
        { icon: CheckCircle2, title: "UK eIDAS and ECA 2000 aligned", body: "Aligned with the Electronic Communications Act 2000, UK eIDAS and the Law Commission's 2019 report on electronic execution of documents." },
        { icon: Sparkles, title: "Witnessed deeds, made simple", body: "Sequential signing routes the deed to the executor, then the witness, capturing both signatures and a full audit trail." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "Law Commission · electronic execution of documents" },
        headline: "Electronic signatures on UK deeds are legal, when the audit trail proves intent.",
        body: "The 2019 Law Commission report and HM Land Registry's 2020 update confirm e-signatures are valid for deeds, provided the signing process is auditable and the signatory's intent is clear. CivicSign's tamper-evident Certificate of Completion is built to evidence that intent.",
      }}
      docsHeadline="Every legal document, signed in minutes"
      docsSubhead="Save them once as templates, reuse them on every matter."
      docs={[
        { icon: ScrollText, title: "Engagement letters and client care", body: "Send SRA-compliant engagement letters with pre-placed signature, identification and ID-check declaration fields." },
        { icon: FileSignature, title: "Witnessed deeds and powers of attorney", body: "Route the deed through grantor then witness using sequential signing, both signatures captured, audit trail intact." },
        { icon: BookOpen, title: "NDAs and confidentiality undertakings", body: "Send mutual and one-way NDAs to counterparties and consultants. Tamper-evident seal on every page." },
        { icon: Gavel, title: "Settlement and compromise agreements", body: "Multi-party signing handles claimant, respondent and counsel, final certificate sealed and downloadable." },
        { icon: Users, title: "Lasting Power of Attorney drafts", body: "Capture client signature and certificate-provider attestation electronically before posting to the OPG." },
        { icon: ShieldCheck, title: "AML and KYC declarations", body: "Capture source-of-funds declarations and PEP checks with timestamped IP, defensible under MLR 2017." },
      ]}
      ctaHeadline="Ready to take the post run off your trainee's desk?"
      ctaSubhead="Start sending engagement letters today. Free for 5 documents a month, no card required, UK GDPR compliant from day one."
      ctaButton="Start free for legal teams"
    />
  );
}