import React from "react";
import {
  HeartPulse, ShieldCheck, Clock, CheckCircle2, Landmark,
  Stethoscope, FileSignature, ScrollText, ClipboardList, UserCheck, Sparkles,
} from "lucide-react";
import { SolutionPageLayout } from "@/components/SolutionPageLayout";
import { BrandAccent } from "@/components/BrandText";

export default function Healthcare() {
  return (
    <SolutionPageLayout
      testidSlug="healthcare"
      industry="Solutions · Healthcare & Care Providers"
      IndustryIcon={HeartPulse}
      headline={<>Consent forms and care plans, <BrandAccent>signed without the paperwork risk.</BrandAccent></>}
      subhead="Built for UK GP practices, private clinics, dentists and CQC-registered care providers. Capture patient consent, care-plan signatures and staff acknowledgements, UK GDPR strict by default, NHS DSPT aligned."
      heroImage={{
        src: "https://images.unsplash.com/photo-1576091160550-2173dba999ef",
        alt: "UK clinician reviewing patient consent on tablet",
      }}
      stats={[
        { value: "DSPT", label: "NHS Data Security toolkit alignment" },
        { value: "0 paper", label: "Consent forms lost in the chart" },
        { value: "100%", label: "UK-hosted patient data" },
      ]}
      whyHeadline="Why UK healthcare providers pick CivicSign"
      whySubhead="Designed with CQC fundamentals of care, the NHS Data Security and Protection Toolkit, and General Medical Council consent guidance in mind."
      why={[
        { icon: Clock, title: "Capture consent before the appointment", body: "Send pre-appointment consent forms by email. Patients sign from home, clinicians see confirmation before the room is prepared." },
        { icon: ShieldCheck, title: "UK GDPR and special-category data ready", body: "Patient data is processed under UK GDPR Article 9 lawful bases. Role-based access separates admin from clinical staff." },
        { icon: CheckCircle2, title: "CQC and GMC aligned", body: "Audit trail captures the GMC consent process: information given, time to consider, signature and any questions raised." },
        { icon: Sparkles, title: "Your practice, your tone of voice", body: "Add your clinic logo, colours and a friendly signing-page banner so anxious patients feel reassured, not bureaucratised." },
      ]}
      compliance={{
        eyebrow: { icon: Landmark, label: "GMC · digital consent guidance" },
        headline: "GMC: written consent does not have to mean paper.",
        body: "The General Medical Council confirms that written patient consent can be captured electronically, provided the patient has had time to consider the information and the signature is verifiable. CivicSign gives you the timestamp, IP address and email verification needed to evidence informed consent, defensible if ever challenged.",
      }}
      docsHeadline="Every clinical and care document, signed in minutes"
      docsSubhead="Pre-built workflows for the consent forms and acknowledgements you send most."
      docs={[
        { icon: Stethoscope, title: "Patient consent to treatment", body: "Capture informed consent for procedures, anaesthesia and information sharing, GMC consent standards baked in." },
        { icon: ClipboardList, title: "Care and support plans (CQC)", body: "Service-user and family signatures on care plans, capacity assessments and DoLS notifications, CQC inspection-ready." },
        { icon: UserCheck, title: "Patient registration and GDPR consent", body: "New-patient registration with privacy-notice acknowledgement and marketing-preference fields, all in one signing flow." },
        { icon: ScrollText, title: "Safeguarding and incident records", body: "Staff sign-off on safeguarding referrals and incident forms, tamper-evident and instantly retrievable for inspection." },
        { icon: FileSignature, title: "Staff DBS and policy attestations", body: "Capture annual DBS declarations, code-of-conduct sign-off and training acknowledgements in bulk." },
        { icon: ShieldCheck, title: "Confidentiality undertakings", body: "Patient confidentiality acknowledgements for locums, students and visiting clinicians." },
      ]}
      ctaHeadline="Ready to stop chasing consent forms across reception?"
      ctaSubhead="Send your first patient consent today. Free for 5 documents a month, UK GDPR strict, NHS DSPT aligned."
      ctaButton="Start free for care providers"
    />
  );
}