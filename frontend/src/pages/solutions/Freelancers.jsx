import React from "react";
import {
  PenLine, ShieldCheck, Clock, CheckCircle2, Landmark,
  FileSignature, ScrollText, Copyright, Wallet, User, Sparkles,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";
import { formatFreePlanDocsAMonth, formatFreePlanDocsShort } from "@/lib/pricing";
import { BrandAccent } from "@/components/BrandText";

export default function Freelancers() {
  return (
    <SolutionPageLayout
      testidSlug="freelancers"
      solutionPath="/solutions/freelancers"
      industry="Solutions · Freelancers & Consultants"
      IndustryIcon={PenLine}
      headline={<>Look professional — clients sign your contract <BrandAccent>before you log off.</BrandAccent></>}
      subhead="Built for UK sole traders, consultants, designers, developers and agency freelancers. Send statements of work, MSAs, IP assignments and payment terms with an audit trail your accountant and clients will trust."
      heroImage={{
        src: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
        alt: "UK freelancer sending contract for signature from home office",
      }}
      stats={[
        { value: "£0", label: `Start free — ${formatFreePlanDocsShort()}` },
        { value: "< 10 min", label: "Typical client onboarding" },
        { value: "100%", label: "UK GDPR by default" },
      ]}
      whyHeadline="Why UK freelancers choose CivicSign"
      whySubhead="No enterprise bloat, no per-envelope games — just fast, court-ready signing for the contracts you send every week."
      why={[
        { icon: Clock, title: "Stop chasing PDFs in WhatsApp", body: "Clients sign via a secure link on any device. You get a sealed PDF and Certificate of Completion — not a blurry photo of a signature." },
        { icon: ShieldCheck, title: "Legally binding under UK law", body: "Electronic signatures are valid for most freelance contracts under the Electronic Communications Act 2000 and UK eIDAS. CivicSign captures intent, identity and tamper-evidence by default." },
        { icon: CheckCircle2, title: "Sole trader and Ltd-friendly", body: "Signature blocks support individual sole traders and limited-company directors signing in the correct capacity." },
        { icon: Sparkles, title: "Your brand, not a generic tool", body: "Add your logo and colours on Pro — clients see a polished freelancer, not a clunky enterprise portal." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "Law Commission · electronic execution (2019)" },
        headline: "One and two-page contracts are still contracts — electronic signing is valid.",
        body: "The Law Commission's 2019 report confirmed electronic signatures are valid for documents required to be 'in writing' or 'signed' under English law, including consultancy agreements and statements of work. What matters is intent, consent and a verifiable audit trail — exactly what CivicSign records on every completion.",
      }}
      docsHeadline="Every freelancer document, signed in minutes"
      docsSubhead="Save your MSA template once — duplicate per client with name, rate and start date swapped in seconds."
      docs={[
        { icon: ScrollText, title: "Statements of work and MSAs", body: "Send scope, deliverables, rate and payment terms in one envelope. Clients countersign before work begins." },
        { icon: FileSignature, title: "Non-disclosure and confidentiality", body: "Protect your ideas before sharing portfolios, code or strategy decks. Mutual and one-way NDAs supported." },
        { icon: Copyright, title: "IP assignment and moral rights", body: "Capture intellectual property transfer and moral rights waivers — essential for design, dev and content work." },
        { icon: Wallet, title: "Payment terms and change orders", body: "Invoice authorisation, deposit confirmations and scope variations signed in writing — fewer payment disputes at month-end." },
        { icon: User, title: "IR35 and status paperwork", body: "Status determination statements and contractor onboarding packs signed electronically (substance of IR35 remains your tax advice)." },
        { icon: ShieldCheck, title: "Data processing agreements", body: "When you handle client personal data, capture a UK GDPR-aligned DPA with timestamped consent and completion evidence." },
      ]}
      ctaHeadline="Ready to send contracts clients actually sign?"
      ctaSubhead={`Start free with ${formatFreePlanDocsAMonth()}. No card, no app for your clients — just a secure link and a professional signing page.`}
      ctaButton="Start free as a freelancer"
    />
  );
}