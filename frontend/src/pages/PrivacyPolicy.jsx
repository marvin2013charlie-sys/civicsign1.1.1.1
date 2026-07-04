import React from "react";
import { LegalLayout } from "@/components/LegalLayout";

const sections = [
  { heading: "Introduction", paragraphs: [
    "CivicBot LTD (“CivicSign”, “we”, “us”), a company registered in England and Wales, is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you have when you use our UK-hosted electronic signature platform and related services (the “Services”). We act as a data controller under UK GDPR and the Data Protection Act 2018.",
    "By using the Services, you agree to the collection and use of information in accordance with this policy.",
  ] },
  { heading: "Information we collect", paragraphs: ["We collect the following categories of information:"], list: [
    "Account information — your name, email address, password (stored hashed), and profile photo if you sign in with Google.",
    "Document data — the documents you upload, the fields you place, and the recipients you add. Documents are processed to enable signing.",
    "Signature data — drawn, typed, or uploaded signature images and the values entered into fields.",
    "Audit data — timestamps, IP addresses, and browser/user-agent information captured to build a tamper-evident audit trail.",
    "Usage data — how you interact with the Services, used to improve performance and reliability.",
  ] },
  { heading: "How we use your information", list: [
    "To provide, operate, and maintain the Services.",
    "To process documents, route them to recipients, and finalize executed agreements.",
    "To generate Certificates of Completion and maintain the integrity of signed records.",
    "To communicate with you about your account, documents, and support requests.",
    "To detect, prevent, and address fraud, abuse, and security issues.",
    "To comply with legal obligations such as the Electronic Communications Act 2000 and the UK eIDAS Regulation (Electronic Identification and Trust Services for Electronic Transactions Regulations 2016).",
  ] },
  { heading: "Legal bases for processing", paragraphs: [
    "Where the GDPR applies, we process personal data on the bases of performance of a contract, our legitimate interests in operating and improving the Services, compliance with legal obligations, and your consent where required.",
  ] },
  { heading: "How we share information", paragraphs: [
    "We do not sell your personal information. We share information only as necessary to provide the Services:",
  ], list: [
    "With recipients and parties to a document you choose to send.",
    "With service providers (e.g., email delivery, cloud hosting) under appropriate confidentiality and data-processing terms.",
    "When required by law, legal process, or to protect rights, safety, and security.",
    "In connection with a merger, acquisition, or sale of assets, with notice where required.",
  ] },
  { heading: "Data retention", paragraphs: [
    "We retain completed documents and their audit trails for as long as your account is active or as needed to provide the Services and meet legal, regulatory, and evidentiary requirements. You may request deletion of specific records subject to applicable retention obligations.",
  ] },
  { heading: "Security", paragraphs: [
    "We use industry-standard safeguards including encryption in transit, hashed passwords, tokenized signing links, and SHA-256 sealing of finalized documents. No method of transmission or storage is 100% secure, but we work continuously to protect your information.",
  ] },
  { heading: "Your rights", paragraphs: [
    "Depending on your location, you may have the right to access, correct, delete, or port your personal data, and to object to or restrict certain processing. To exercise these rights, contact us at privacy@civicsign.com.",
  ] },
  { heading: "International transfers", paragraphs: [
    "Your information may be processed in countries other than your own. Where required, we rely on appropriate safeguards such as standard contractual clauses for cross-border transfers.",
  ] },
  { heading: "Children’s privacy", paragraphs: [
    "The Services are not directed to individuals under 18, and we do not knowingly collect personal information from children.",
  ] },
  { heading: "Changes to this policy", paragraphs: [
    "We may update this Privacy Policy from time to time. We will post the updated version with a new “Last updated” date and, where appropriate, notify you.",
  ] },
  { heading: "Contact us", paragraphs: [
    "If you have questions about this Privacy Policy or our data practices, contact us at privacy@civicsign.com or via our Contact page.",
  ] },
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="June 1, 2026"
      intro="Your trust matters. This policy describes how CivicSign handles your personal information and document data."
      sections={sections}
    />
  );
}
