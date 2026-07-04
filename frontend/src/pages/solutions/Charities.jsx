import React from "react";
import {
  Heart, ShieldCheck, Clock, CheckCircle2, Landmark,
  HandHeart, FileSignature, ScrollText, UserPlus, Banknote, Sparkles,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";

export default function Charities() {
  return (
    <SolutionPageLayout
      testidSlug="charities"
      industry="Solutions · Charities & Non-profits"
      IndustryIcon={Heart}
      headline={<>Gift Aid & trustee consents, <span style={{ color: "var(--c-primary)" }}>signed before donor remorse kicks in.</span></>}
      subhead="Built for UK registered charities, CICs and community trusts. Capture Gift Aid declarations, trustee resolutions, volunteer agreements and DBS attestations — Charity Commission and HMRC aligned."
      heroImage={{
        src: "https://images.unsplash.com/photo-1593113598332-cd288d649433",
        alt: "UK charity volunteer signing agreement on phone",
      }}
      stats={[
        { value: "25%", label: "Gift Aid uplift captured at the door" },
        { value: "0 paper", label: "Lost trustee resolutions" },
        { value: "Free £0", label: "Forever-free tier for small charities" },
      ]}
      whyHeadline="Why UK charities trust CivicSign"
      whySubhead="Built with the Charity Commission's governance code, HMRC Gift Aid scheme rules and the realities of running on a shoestring."
      why={[
        { icon: Clock, title: "Convert donor enthusiasm before it fades", body: "Tap-to-sign Gift Aid declarations on a steward's phone at the event — confirmation in donor's inbox before they get home." },
        { icon: ShieldCheck, title: "UK GDPR & safeguarding ready", body: "Donor, volunteer and beneficiary data is processed under UK GDPR. Role-based access protects safeguarding records." },
        { icon: CheckCircle2, title: "HMRC & Charity Commission aligned", body: "Gift Aid declarations carry the donor's name, address and HMRC-required confirmation — audit-ready for HMRC reviews." },
        { icon: Sparkles, title: "Your cause, your branding", body: "Add your charity logo, colours and signing-page banner so supporters see your cause, not generic SaaS chrome." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "HMRC · electronic Gift Aid declarations" },
        headline: "HMRC accepts electronic Gift Aid declarations.",
        body: "HMRC's detailed guidance on Gift Aid (Chapter 3) confirms declarations can be made electronically — by tick-box, email or signed form — provided you retain the donor's name, address, gift details and the required confirmation. CivicSign captures all of it with a sealed audit trail. Your HMRC compliance review goes from a panic to a printout.",
      }}
      docsHeadline="Every charity document, signed in minutes"
      docsSubhead="From trustee meetings to volunteer onboarding — paperless, audited and free for your first 5 docs / month."
      docs={[
        { icon: Banknote,      title: "Gift Aid declarations & sponsorship forms", body: "Capture donor name, address, gift details and the HMRC-required confirmation — at the door or via fundraising emails." },
        { icon: HandHeart,     title: "Volunteer agreements & DBS undertakings", body: "Onboard volunteers with role descriptions, expectations and safeguarding undertakings signed before their first shift." },
        { icon: FileSignature, title: "Trustee resolutions & minutes", body: "Capture trustee consent to written resolutions without convening a board meeting — Charity Commission compliant." },
        { icon: ScrollText,    title: "Beneficiary consent & safeguarding", body: "Where beneficiary consent is needed (e.g. case studies, photographs), capture it ethically with full audit trail." },
        { icon: UserPlus,      title: "Staff contracts & policy attestations", body: "Charity sector employment contracts, code-of-conduct sign-off and annual policy acknowledgements in one flow." },
        { icon: ShieldCheck,   title: "Data-sharing agreements", body: "Sign joint working / data-sharing agreements with partner charities — UK GDPR Article 28 compliant." },
      ]}
      ctaHeadline="Ready to put more of every pound into your cause?"
      ctaSubhead="Free forever for your first 5 documents a month — no card required, UK GDPR by default. Discounts for registered charities on paid plans."
      ctaButton="Start free for your charity"
    />
  );
}
