import React from "react";
import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/LegalLayout";
import { LEGAL_COMPANY, LEGAL_LAST_UPDATED } from "@/lib/legalConstants";

const sections = [
  {
    heading: "What are cookies?",
    paragraphs: [
      "Cookies are small text files placed on your device when you visit a website. They help sites function, remember preferences, and understand how they are used.",
      "CivicSign also uses similar technologies such as local storage and session storage for authentication, preferences, and product guidance.",
      <>For how we handle personal data more broadly, see our <Link to="/legal/privacy" className="font-medium text-[var(--c-primary)] hover:underline">Privacy Policy</Link>.</>,
    ],
  },
  {
    heading: "How we use cookies",
    paragraphs: [
      "We use strictly necessary cookies and local storage to keep you signed in, protect against fraud, and operate core features. Optional analytics cookies, where enabled, help us measure and improve performance.",
      "We do not use cookies to sell your personal information or to track you across unrelated third-party websites for advertising purposes.",
    ],
  },
  {
    heading: "Cookies we use",
    paragraphs: [
      "The table below describes the main cookies and storage keys used on CivicSign. Exact names may change as we improve the product.",
    ],
    table: {
      headers: ["Name / key", "Type", "Purpose", "Duration"],
      rows: [
        ["cs_access_token (cookie)", "Strictly necessary", "Authenticates your session with the API", "Session / short-lived"],
        ["cs_refresh_token (cookie)", "Strictly necessary", "Refreshes your session securely", "Up to 30 days"],
        ["cs_cookie_consent (local)", "Functional", "Remembers your cookie preference choice", "Until cleared"],
        ["cs_product_tour_* (local)", "Functional", "Remembers product tour completion", "Persistent"],
        ["_ga / _ga_* (Google Analytics)", "Analytics (optional)", "Aggregated page views and product usage when you accept all cookies", "Up to 2 years"],
        ["Optional analytics (if enabled)", "Analytics", "Aggregated usage and performance metrics", "As configured"],
      ],
    },
  },
  {
    heading: "Managing your preferences",
    paragraphs: [
      "When you first visit CivicSign, our cookie banner lets you accept all cookies or essential cookies only. Essential cookies are required for sign-in and core functionality.",
      "You can also control cookies through your browser settings. Blocking strictly necessary cookies may prevent you from signing in or using key features.",
    ],
    callout: {
      type: "info",
      text: "To change your choice after dismissing the banner, clear site data for civicsign in your browser or contact info@civicbot.co.uk for guidance.",
    },
  },
  {
    heading: "Third-party cookies",
    paragraphs: [
      "Some features rely on trusted third parties — for example, our payment processor (Stripe) when you checkout, or our email delivery provider when notifications are sent. Those providers may set their own cookies in accordance with their privacy policies.",
      "We do not permit third parties to use cookies on CivicSign for unrelated advertising.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "We may update this Cookie Policy from time to time. The latest version will always be available on this page with an updated “Last updated” date.",
    ],
  },
  {
    heading: "Contact us",
    paragraphs: [
      "Cookie and privacy questions: info@civicbot.co.uk",
      <>You can also reach us via our <Link to="/contact" className="font-medium text-[var(--c-primary)] hover:underline">Contact page</Link> or write to {LEGAL_COMPANY.name}, {LEGAL_COMPANY.address}.</>,
    ],
  },
];

const highlights = [
  "Essential cookies only by default option",
  "No ad-tracking cookies",
  "Clear consent banner",
  "Aligned with UK GDPR",
];

export default function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      updated={LEGAL_LAST_UPDATED.cookies}
      intro="This policy explains how CivicSign uses cookies and similar technologies, what each category does, and how you can manage your preferences."
      highlights={highlights}
      sections={sections}
    />
  );
}