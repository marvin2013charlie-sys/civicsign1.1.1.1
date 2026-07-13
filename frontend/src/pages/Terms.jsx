import React from "react";
import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/LegalLayout";
import { LEGAL_COMPANY, LEGAL_LAST_UPDATED } from "@/lib/legalConstants";

const sections = [
  {
    heading: "Acceptance of terms",
    paragraphs: [
      `These Terms & Conditions (“Terms”) govern your access to and use of the CivicSign electronic signature platform and related services (the “Services”) provided by ${LEGAL_COMPANY.name}, registered in ${LEGAL_COMPANY.jurisdiction} (registered office: ${LEGAL_COMPANY.address}).`,
      "By creating an account, signing in, or otherwise using the Services, you agree to be bound by these Terms, our Privacy Policy, and our Cookie Policy. If you do not agree, do not use the Services.",
    ],
  },
  {
    heading: "Description of the Services",
    paragraphs: [
      "CivicSign enables users to upload documents, place signing fields, send documents to recipients, collect electronic signatures, and generate finalized documents with a Certificate of Completion and audit trail. Features available to you depend on your plan.",
    ],
  },
  {
    heading: "Accounts & eligibility",
    paragraphs: [
      "You must be at least 18 years old and capable of entering into a binding contract to use the Services. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.",
      "You agree to provide accurate registration information and to keep it up to date. Notify us promptly if you suspect unauthorised access to your account.",
    ],
  },
  {
    heading: "Electronic signatures & legal validity",
    paragraphs: [
      "You acknowledge that electronic signatures created through the Services are intended to be legally binding under English law, including the Electronic Communications Act 2000 and the UK eIDAS Regulation (Electronic Identification and Trust Services for Electronic Transactions Regulations 2016), consistent with the Law Commission's 2019 report on the electronic execution of documents — provided requirements of intent, consent, attribution, and record retention are met.",
      "You are solely responsible for determining whether electronic signatures are appropriate for your documents, jurisdiction, and regulatory context. CivicSign does not provide legal advice.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: ["You agree not to:"],
    list: [
      "Use the Services for unlawful, fraudulent, harassing, or deceptive purposes.",
      "Upload content that infringes intellectual property, privacy, or other third-party rights.",
      "Attempt to circumvent security controls, tamper with audit records, or disrupt the Services.",
      "Send unsolicited or unauthorised communications through the Services.",
      "Use the Services to store or transmit malware or harmful code.",
    ],
  },
  {
    heading: "Your content & intellectual property",
    paragraphs: [
      "You retain all rights to documents and content you upload. You grant CivicSign a limited licence to host, process, transmit, and display your content solely to provide the Services.",
      "The Services — including software, design, branding, and documentation — are owned by CivicSign or its licensors and protected by applicable intellectual-property laws.",
    ],
  },
  {
    heading: "Fees, billing & document limits",
    paragraphs: [
      "Certain features require a paid subscription or pay-as-you-go purchase. Prices, billing intervals, and plan features are shown at checkout and on our Pricing page. Unless stated otherwise, prices exclude UK VAT, which is added at checkout where applicable.",
      "Free and paid plans include a monthly document allowance that resets on the anniversary of your account registration date — not on the first day of the calendar month. Deleting envelopes does not restore allowance within the current billing period.",
      <>Refund eligibility is set out in our <Link to="/legal/refunds" className="font-medium text-[var(--c-primary)] hover:underline">Refund Policy</Link>. Except where required by law or expressly stated in that policy, fees are non-refundable once paid features have been used.</>,
    ],
  },
  {
    heading: "Availability & disclaimers",
    paragraphs: [
      "We strive to keep the Services available and reliable, but do not guarantee uninterrupted or error-free operation. Maintenance, upgrades, or events outside our control may cause temporary interruptions.",
      "The Services are provided “as is” and “as available” without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement, to the fullest extent permitted by law.",
    ],
  },
  {
    heading: "Limitation of liability",
    paragraphs: [
      "Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law, including liability for death or personal injury caused by negligence, or fraud.",
      "Subject to the above, CivicSign shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill, arising from your use of the Services.",
      "Our total aggregate liability arising out of or relating to the Services in any twelve-month period is limited to the greater of (a) amounts you paid to CivicSign in that period, or (b) £100, except where a higher minimum is required by law.",
    ],
  },
  {
    heading: "Indemnification",
    paragraphs: [
      "You agree to indemnify and hold harmless CivicSign, its officers, and employees from claims, damages, losses, and expenses (including reasonable legal fees) arising from your content, your use of the Services, or your breach of these Terms.",
    ],
  },
  {
    heading: "Suspension & termination",
    paragraphs: [
      "We may suspend or terminate your access if you breach these Terms, if required by law, or if your use may harm CivicSign or other users. You may stop using the Services at any time and may request account closure by contacting us.",
      "Provisions that by their nature should survive termination — including intellectual property, disclaimers, limitation of liability, and governing law — will survive.",
    ],
  },
  {
    heading: "Governing law & disputes",
    paragraphs: [
      "These Terms are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction, except where mandatory consumer protection laws in your country of residence give you the right to bring proceedings elsewhere.",
    ],
  },
  {
    heading: "Changes to these Terms",
    paragraphs: [
      "We may update these Terms from time to time. We will post the revised version with an updated date. Where changes are material, we will provide reasonable notice. Continued use after changes take effect constitutes acceptance of the revised Terms.",
    ],
  },
  {
    heading: "Contact us",
    paragraphs: [
      "Questions about these Terms: info@civicbot.co.uk",
      <>You can also use our <Link to="/contact" className="font-medium text-[var(--c-primary)] hover:underline">Contact page</Link> or write to {LEGAL_COMPANY.name}, {LEGAL_COMPANY.address}.</>,
    ],
  },
];

const highlights = [
  "Governed by English law",
  "You keep rights to your documents",
  "Clear billing & refund rules",
  "No legal advice provided",
];

export default function Terms() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      updated={LEGAL_LAST_UPDATED.terms}
      intro="Please read these Terms carefully before using CivicSign. They set out the rules for accessing and using our platform."
      highlights={highlights}
      sections={sections}
    />
  );
}