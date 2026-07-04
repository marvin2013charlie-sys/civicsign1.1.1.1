import React from "react";
import {
  HardHat, ShieldCheck, Clock, CheckCircle2, Landmark,
  Wrench, FileSignature, ScrollText, ClipboardList, FileText, Sparkles,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";

export default function Construction() {
  return (
    <SolutionPageLayout
      testidSlug="construction"
      industry="Solutions · Construction & Trades"
      IndustryIcon={HardHat}
      headline={<>Quotes, JCT contracts & RAMS — <span style={{ color: "var(--c-primary)" }}>signed off-site, on the phone.</span></>}
      subhead="Built for UK builders, electricians, plumbers, M&E contractors and main contractors. Send quotes, JCT contracts, sub-contractor agreements and risk assessments from the van — UK GDPR and CDM 2015 aware."
      heroImage={{
        src: "https://images.unsplash.com/photo-1503387762-592deb58ef4e",
        alt: "UK construction site manager signing contract on phone",
      }}
      stats={[
        { value: "< 2 hrs", label: "Quote-to-deposit turnaround" },
        { value: "0 paper", label: "RAMS lost on a job site" },
        { value: "Mobile", label: "Sign from any phone, any van" },
      ]}
      whyHeadline="Why UK trades pick CivicSign"
      whySubhead="Designed for the messy reality of UK construction — main-contractor PSLs, CIS deductions, CDM 2015 paperwork and clients who never check their email."
      why={[
        { icon: Clock, title: "Win the job before the next quote arrives", body: "Send the quote from your phone, client signs from their sofa — your van is on-site before the competitor has emailed." },
        { icon: ShieldCheck, title: "UK GDPR & CDM 2015 ready", body: "Client and worker data processed under UK GDPR. Risk assessments and method statements timestamped and retrievable." },
        { icon: CheckCircle2, title: "UK contract law aligned", body: "Aligned with the Electronic Communications Act 2000 and UK eIDAS — your JCT short-form contracts are enforceable." },
        { icon: Sparkles, title: "Your trade, your branding", body: "Add your firm logo, colours and signing-page banner so customers feel they're dealing with a proper outfit." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "HSE · CDM 2015 record-keeping" },
        headline: "Your RAMS file, signed and retrievable in minutes.",
        body: "CDM 2015 expects principal contractors to keep evidence that risk assessments and method statements have been read and acknowledged by every operative. CivicSign captures the signature, IP and timestamp — every RAMS in one searchable place. If the HSE comes knocking, your file is one click away.",
      }}
      docsHeadline="Every construction document, signed in minutes"
      docsSubhead="From quote to handover — UK trades paperwork, paperless."
      docs={[
        { icon: FileText,      title: "Quotes & deposit acceptances", body: "Send branded quotes with deposit-acceptance signature pre-placed — customer signs and pays before the schedule slips." },
        { icon: FileSignature, title: "JCT short-form & sub-contractor contracts", body: "Send JCT short-form, JCT Minor Works and your own sub-contractor terms — sequential signing for multi-party." },
        { icon: ClipboardList, title: "Risk assessments & method statements", body: "Every operative signs their RAMS before stepping on-site. Audit trail satisfies CDM 2015 record-keeping." },
        { icon: Wrench,        title: "Variation orders & change requests", body: "Capture client sign-off on variations and scope changes — protect margins, avoid end-of-job disputes." },
        { icon: ScrollText,    title: "CIS / self-employed declarations", body: "Capture CIS subcontractor declarations and UTR confirmations electronically — your monthly return is HMRC-ready." },
        { icon: ShieldCheck,   title: "Handover & sign-off certificates", body: "Final client sign-off on snagging, handover and retention — locks in payment, closes the job." },
      ]}
      ctaHeadline="Ready to send quotes from the van and get paid?"
      ctaSubhead="Stop losing jobs to the company that emails first. Free for 5 documents a month, no card required."
      ctaButton="Start free for trades"
    />
  );
}
