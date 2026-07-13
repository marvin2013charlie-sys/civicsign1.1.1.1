import React from "react";
import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/LegalLayout";
import { LEGAL_COMPANY, LEGAL_LAST_UPDATED } from "@/lib/legalConstants";

const sections = [
  {
    heading: "Introduction",
    paragraphs: [
      `${LEGAL_COMPANY.name} (“CivicSign”, “we”, “us”, or “our”), a company registered in ${LEGAL_COMPANY.jurisdiction}, is committed to protecting your privacy. This Privacy Policy explains what personal data we collect, how we use it, who we share it with, and the rights you have when you use our UK-hosted electronic signature platform and related services (the “Services”).`,
      "We act as a data controller under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. By using the Services, you acknowledge that you have read this policy.",
      <>For how we use cookies and similar technologies, see our <Link to="/legal/cookies" className="font-medium text-[var(--c-primary)] hover:underline">Cookie Policy</Link>. For contractual terms governing use of the Services, see our <Link to="/legal/terms" className="font-medium text-[var(--c-primary)] hover:underline">Terms &amp; Conditions</Link>.</>,
    ],
  },
  {
    heading: "Information we collect",
    paragraphs: ["We collect the following categories of information:"],
    list: [
      "Account information — your name, email address, password (stored using a one-way hash), optional profile photo, and plan details.",
      "Document data — files you upload, fields you place, recipient details you add, and messages attached to envelopes. Documents are processed solely to enable preparation, signing, and completion.",
      "Signature data — drawn, typed, or uploaded signature images and values entered into signing fields.",
      "Audit data — timestamps, IP addresses, browser or device identifiers, and event records used to build a tamper-evident audit trail.",
      "Usage and technical data — how you interact with the Services, error logs, and performance metrics used to maintain reliability and security.",
      "Billing data — subscription status and payment references processed by our payment provider. We do not store full card numbers on our servers.",
      "Support communications — messages you send via our contact form or email.",
    ],
  },
  {
    heading: "How we use your information",
    list: [
      "To provide, operate, maintain, and improve the Services.",
      "To prepare documents, route them to recipients, capture signatures, and produce finalized records with a Certificate of Completion.",
      "To authenticate users, prevent fraud, and protect the security of accounts and documents.",
      "To communicate with you about your account, envelopes, billing, and support requests.",
      "To comply with legal obligations, including electronic signature and record-keeping requirements under UK law.",
      "To enforce our Terms & Conditions and protect the rights, safety, and property of CivicSign, our users, and others.",
    ],
  },
  {
    heading: "Legal bases for processing",
    paragraphs: [
      "Where UK GDPR applies, we process personal data on one or more of the following bases:",
    ],
    list: [
      "Performance of a contract — to provide the Services you have signed up for.",
      "Legitimate interests — to operate, secure, and improve the platform, prevent abuse, and support customers, balanced against your rights.",
      "Legal obligation — where we must retain or disclose information to comply with applicable law.",
      "Consent — where required, for example optional analytics cookies (see our Cookie Policy).",
    ],
  },
  {
    heading: "How we share information",
    paragraphs: [
      "We do not sell your personal information. We share data only where necessary to deliver the Services or where the law requires it:",
    ],
    list: [
      "With recipients and other parties you choose to include on a document.",
      "With trusted service providers (such as cloud hosting, email delivery, and payment processing) under appropriate confidentiality and data-processing terms.",
      "When required by law, court order, regulatory request, or to protect rights, safety, and security.",
      "In connection with a merger, acquisition, or sale of assets, with notice where required by law.",
    ],
  },
  {
    heading: "International transfers",
    paragraphs: [
      "Your information is primarily processed in the United Kingdom. Where data is transferred outside the UK, we rely on appropriate safeguards — such as the UK International Data Transfer Agreement or equivalent mechanisms — unless an adequacy decision applies.",
    ],
  },
  {
    heading: "Data retention",
    paragraphs: [
      "We retain account information for as long as your account is active and for a reasonable period afterwards to resolve disputes and meet legal obligations.",
      "Completed documents and audit trails are retained for as long as needed to provide the Services and to support evidentiary, regulatory, and contractual requirements. You may request deletion of specific records, subject to applicable retention duties and the rights of other parties to signed documents.",
      "When you close your account, we delete or anonymise personal data where we are not required or permitted to retain it.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "We implement technical and organisational measures designed to protect your information, including encryption in transit (TLS), hashed passwords, scoped encryption of stored documents, tokenised signing links, and SHA-256 sealing of finalized PDFs.",
      "No method of transmission or storage is completely secure. We continuously review and improve our safeguards, but cannot guarantee absolute security.",
    ],
    callout: {
      type: "info",
      text: "CivicSign staff and support impersonation sessions cannot download customer document content. Document bytes remain encrypted and inaccessible during support access.",
    },
  },
  {
    heading: "Your rights",
    paragraphs: [
      "Under UK GDPR, you may have the right to access, rectify, erase, restrict, or object to certain processing of your personal data, and to data portability where applicable. You may also withdraw consent where processing is consent-based, without affecting the lawfulness of processing before withdrawal.",
      "To exercise your rights, email info@civicbot.co.uk from your registered account email. We may need to verify your identity before responding. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.",
    ],
  },
  {
    heading: "Children's privacy",
    paragraphs: [
      "The Services are not directed at individuals under 18, and we do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us so we can take appropriate steps.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. We will post the revised version on this page with an updated “Last updated” date and, where changes are material, provide additional notice where appropriate.",
    ],
  },
  {
    heading: "Contact us",
    paragraphs: [
      "Privacy and data-protection enquiries: info@civicbot.co.uk",
      <>You can also reach us via our <Link to="/contact" className="font-medium text-[var(--c-primary)] hover:underline">Contact page</Link> or in writing at {LEGAL_COMPANY.name}, {LEGAL_COMPANY.address}.</>,
    ],
  },
];

const highlights = [
  "We never sell your data",
  "UK GDPR aligned",
  "Encrypted document storage",
  "You control who receives documents",
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated={LEGAL_LAST_UPDATED.privacy}
      intro="Your trust matters. This policy explains how CivicSign collects, uses, and protects your personal information and document data."
      highlights={highlights}
      sections={sections}
    />
  );
}