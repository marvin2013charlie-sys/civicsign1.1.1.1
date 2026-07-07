import React from "react";
import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/LegalLayout";

const sections = [
  { heading: "Acceptance of terms", paragraphs: [
    "These Terms & Conditions (“Terms”) govern your access to and use of the CivicSign electronic signature platform and related services (the “Services”) provided by CivicBot LTD, a company registered in England and Wales (registered office: 71-75 Shelton Street, Covent Garden, London WC2H 9JQ, United Kingdom). By creating an account or using the Services, you agree to be bound by these Terms.",
  ] },
  { heading: "Description of the Services", paragraphs: [
    "CivicSign enables users to upload documents, place fields, send documents to recipients, capture electronic signatures, and generate finalized documents with a Certificate of Completion and audit trail.",
  ] },
  { heading: "Accounts", paragraphs: [
    "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You agree to provide accurate information and to keep it up to date.",
  ] },
  { heading: "Electronic signatures & legal validity", paragraphs: [
    "You acknowledge that electronic signatures created through the Services are intended to be legally binding under English law, including the Electronic Communications Act 2000 and the UK eIDAS Regulation (Electronic Identification and Trust Services for Electronic Transactions Regulations 2016), and consistent with the Law Commission's 2019 report on the electronic execution of documents, provided the requirements of intent, consent, attribution, and record retention are met. You are responsible for determining whether electronic signatures are appropriate for your particular documents and jurisdiction.",
  ] },
  { heading: "Acceptable use", paragraphs: ["You agree not to:"], list: [
    "Use the Services for unlawful, fraudulent, or deceptive purposes.",
    "Upload content that infringes intellectual property or privacy rights.",
    "Attempt to circumvent security, tamper with audit records, or disrupt the Services.",
    "Send unsolicited or unauthorized communications through the Services.",
  ] },
  { heading: "Intellectual property", paragraphs: [
    "The Services, including all software, design, and branding, are owned by CivicSign and protected by applicable laws. You retain all rights to the documents and content you upload.",
  ] },
  { heading: "Fees & billing cycles", paragraphs: [
    "Certain features may require a paid subscription. Fees, billing cycles, and plan details will be presented at the time of purchase.",
    "Free and paid plans include a monthly document allowance that resets on the anniversary of your account registration date (not on the 1st of the calendar month). Deleting documents does not restore your allowance within the current billing period.",
    <>Refund eligibility for subscriptions and pay-as-you-go purchases is set out in our <Link to="/legal/refunds" className="font-medium text-[var(--c-primary)] hover:underline">Refund Policy</Link>. Except where required by law or stated in that policy, fees are non-refundable once paid features have been used.</>,
  ] },
  { heading: "Disclaimers", paragraphs: [
    "The Services are provided “as is” and “as available” without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. CivicSign does not provide legal advice.",
  ] },
  { heading: "Limitation of liability", paragraphs: [
    "To the maximum extent permitted by law, CivicSign shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, arising from your use of the Services.",
  ] },
  { heading: "Indemnification", paragraphs: [
    "You agree to indemnify and hold harmless CivicSign from any claims, damages, or expenses arising from your use of the Services or violation of these Terms.",
  ] },
  { heading: "Termination", paragraphs: [
    "We may suspend or terminate your access to the Services for violation of these Terms or for any conduct that may harm CivicSign or other users. You may stop using the Services at any time.",
  ] },
  { heading: "Governing law", paragraphs: [
    "These Terms are governed by the laws of England and Wales, and you submit to the exclusive jurisdiction of the courts of England and Wales, without regard to conflict-of-law principles.",
  ] },
  { heading: "Changes to these Terms", paragraphs: [
    "We may update these Terms from time to time. Continued use of the Services after changes take effect constitutes acceptance of the revised Terms.",
  ] },
  { heading: "Contact us", paragraphs: [
    "Questions about these Terms can be directed to info@civicbot.co.uk or via our Contact page.",
  ] },
];

export default function Terms() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      updated="June 1, 2026"
      intro="Please read these Terms carefully before using CivicSign. They set out the rules for using our platform."
      sections={sections}
    />
  );
}
