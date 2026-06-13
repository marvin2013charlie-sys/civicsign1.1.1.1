import React from "react";
import {
  PoundSterling, ShieldCheck, Clock, CheckCircle2, Landmark,
  Calculator, FileSignature, ScrollText, Receipt, Building2, Sparkles,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";

export default function FinancialServices() {
  return (
    <SolutionPageLayout
      testidSlug="finance"
      industry="Solutions · Financial Services & Accountants"
      IndustryIcon={PoundSterling}
      headline={<>Onboard clients & file engagements <span style={{ color: "var(--c-primary)" }}>without breaking AML rules.</span></>}
      subhead="Built for UK accountants, IFAs, bookkeepers and financial advisers. Send engagement letters, AML declarations, 64-8 authorities and direct debit mandates — FCA-aware, ICAEW/ACCA-aligned."
      heroImage={{
        src: "https://images.unsplash.com/photo-1554224155-6726b3ff858f",
        alt: "UK accountant reviewing signed engagement letter on screen",
      }}
      stats={[
        { value: "< 1 day", label: "Client onboarding turnaround" },
        { value: "MLR 2017", label: "AML-aware audit trail" },
        { value: "100%", label: "UK-owned & UK-hosted" },
      ]}
      whyHeadline="Why UK practices choose CIVICSIGN"
      whySubhead="Designed around the MLR 2017 / 2019 regulations and ICAEW / ACCA / AAT engagement-letter guidance."
      why={[
        { icon: Clock, title: "Get fee approvals before the deadline", body: "Send engagement letters with fee schedules pre-filled. Client signs from their phone before HMRC's filing deadline." },
        { icon: ShieldCheck, title: "AML & PEP-check aligned", body: "Capture source-of-funds declarations and PEP confirmations with timestamped IP — your MLR 2017 file is audit-ready." },
        { icon: CheckCircle2, title: "ICO & ICAEW aligned", body: "Client data processed under UK GDPR. Audit trail satisfies ICAEW's record-keeping requirements for engagement evidence." },
        { icon: Sparkles, title: "Your practice, your branding", body: "Add your firm logo, colours and signing-page banner so clients see a polished professional — not a generic SaaS." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "ICAEW · electronic engagement letters" },
        headline: "ICAEW confirms: electronic engagement letters are valid.",
        body: "Both ICAEW and ACCA permit engagement letters to be signed electronically, provided you can evidence the client's identity and the date of agreement. CIVICSIGN captures both — IP, timestamp, email verification and a sealed Certificate of Completion. Your file passes monitoring review every time.",
      }}
      docsHeadline="Every accounting & financial document, signed in minutes"
      docsSubhead="Save your engagement pack as a template — every client, in one click."
      docs={[
        { icon: ScrollText,    title: "Engagement letters & terms of business", body: "Send tax / audit / bookkeeping engagement letters with fee schedules and signature pre-placed. ICAEW compliant." },
        { icon: FileSignature, title: "64-8 authorisations & HMRC mandates", body: "Capture HMRC agent authorisations electronically before submitting to HMRC's online portal." },
        { icon: ShieldCheck,   title: "AML / source-of-funds declarations", body: "Defensible AML evidence: client declaration, ID-check confirmation and PEP status — all timestamped under MLR 2017." },
        { icon: Receipt,       title: "Direct debit & DD mandates", body: "Capture client DD mandate authorisation electronically before submitting via your BACS bureau." },
        { icon: Calculator,    title: "Fee variations & scope changes", body: "Out-of-scope work or fee uplifts signed off in writing — protect realisation rates and avoid disputes." },
        { icon: Building2,     title: "Disengagement & file-transfer letters", body: "Clean exits with disengagement letters and professional-clearance correspondence — signed and sealed." },
      ]}
      ctaHeadline="Ready to bill faster and file calmer?"
      ctaSubhead="Send your first engagement letter today. Free for 5 documents a month, UK GDPR by default, AML-ready audit trail."
      ctaButton="Start free for practices"
    />
  );
}
