import React from "react";
import {
  Briefcase, ShieldCheck, Clock, CheckCircle2, Landmark,
  FileSignature, ScrollText, Handshake, Receipt, TrendingUp, Sparkles,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";
import { formatFreePlanSignupPitch } from "@/lib/pricing";
import { BrandAccent } from "@/components/BrandText";

export default function Sales() {
  return (
    <SolutionPageLayout
      testidSlug="sales"
      solutionPath="/solutions/sales"
      industry="Solutions · Sales Teams"
      IndustryIcon={Briefcase}
      headline={<>Close deals the same day you <BrandAccent>send the contract.</BrandAccent></>}
      subhead="Built for UK B2B sales, account executives and revenue teams. Send proposals, order forms, MSAs and NDAs with a court-ready audit trail — clients sign from their phone before your follow-up call."
      heroImage={{
        src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
        alt: "UK sales professional reviewing signed proposal on laptop",
      }}
      stats={[
        { value: "< 3 hrs", label: "Average quote-to-signature time" },
        { value: "0", label: "Printers required for closing" },
        { value: "100%", label: "UK eIDAS aligned" },
      ]}
      whyHeadline="Why UK sales teams pick CivicSign"
      whySubhead="Designed around how British revenue teams actually close — fast signatures, clean audit trails and no enterprise procurement theatre."
      why={[
        { icon: Clock, title: "Same-day closes, not same-week chases", body: "Send the proposal in the meeting. Your buyer countersigns before end of day — pipeline velocity you can measure in CRM, not hope for in email." },
        { icon: ShieldCheck, title: "Legal weight without legal friction", body: "Every completion includes consent, attribution, timestamps and a SHA-256 seal under the Electronic Communications Act 2000 and UK eIDAS." },
        { icon: CheckCircle2, title: "RevOps-ready records", body: "Certificate of Completion links signer email, IP and envelope ID — finance and legal can trace who agreed to what, when." },
        { icon: Sparkles, title: "Look enterprise, move like a startup", body: "Branded signing pages on Pro and Business plans. Your two-person team closes like a FTSE supplier." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "Electronic Communications Act 2000 · s.7" },
        headline: "Electronic signatures are admissible as evidence in UK court.",
        body: "Section 7 of the Electronic Communications Act 2000 makes electronic signatures admissible as evidence of authentication. Combined with UK eIDAS tiers and CivicSign's tamper-evident audit trail, your signed order forms and MSAs carry the same evidential weight as wet ink for most commercial contracts.",
      }}
      docsHeadline="Every sales document, signed in minutes"
      docsSubhead="Save your quote and MSA templates once — send personalised envelopes in seconds."
      docs={[
        { icon: TrendingUp, title: "Proposals and sales quotes", body: "Capture buyer acceptance on pricing, scope and payment terms. Pre-place signature and date fields on your standard quote PDF." },
        { icon: ScrollText, title: "Master service agreements and order forms", body: "Route MSAs and purchase orders for counter-signature. Sequential or parallel signing for multi-stakeholder deals." },
        { icon: FileSignature, title: "NDAs before demos and pilots", body: "Send mutual NDAs before sharing pricing or product roadmaps. Signed in minutes, not lost in legal review for a week." },
        { icon: Handshake, title: "Partner and reseller agreements", body: "Channel partnerships, referral terms and reseller schedules signed electronically with a full completion certificate." },
        { icon: Receipt, title: "Change orders and scope variations", body: "Upsell and scope changes signed in writing before work starts — protects margin and reduces 'we never agreed that' disputes." },
        { icon: ShieldCheck, title: "SOWs and professional services schedules", body: "Attach statements of work to the MSA in one envelope. One audit trail, one completion date, one file for finance." },
      ]}
      ctaHeadline="Ready to stop losing deals to signature delay?"
      ctaSubhead={`Send your first proposal today. ${formatFreePlanSignupPitch()} — clients sign via a secure link on any device.`}
      ctaButton="Start free for sales teams"
    />
  );
}