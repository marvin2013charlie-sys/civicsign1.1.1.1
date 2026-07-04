import React from "react";
import { LegalLayout } from "@/components/LegalLayout";

const sections = [
  { heading: "What are cookies?", paragraphs: [
    "Cookies are small text files placed on your device when you visit a website. They help the site function, remember your preferences, and understand how it is used. CivicSign also uses similar technologies such as local storage.",
  ] },
  { heading: "Types of cookies we use", list: [
    "Strictly necessary — required to operate the Services, including keeping you signed in (authentication tokens) and securing requests. These cannot be switched off.",
    "Functional — remember your preferences, such as your cookie consent choice.",
    "Analytics — help us understand usage so we can improve performance and reliability. These are optional.",
  ] },
  { heading: "How we use cookies", paragraphs: [
    "We use strictly necessary cookies and local storage to authenticate your session and protect against fraud. Optional analytics may be used to measure and improve the Services. We do not use cookies to sell your personal information.",
  ] },
  { heading: "Managing your preferences", paragraphs: [
    "When you first visit CivicSign, you can choose to accept all cookies or essential cookies only. You can also control cookies through your browser settings — note that blocking strictly necessary cookies may prevent you from signing in or using core features.",
  ] },
  { heading: "Third-party cookies", paragraphs: [
    "Some features rely on trusted third parties (for example, Google sign-in and email delivery). These providers may set their own cookies in accordance with their privacy policies.",
  ] },
  { heading: "Changes to this policy", paragraphs: [
    "We may update this Cookie Policy from time to time. The latest version will always be available on this page with an updated date.",
  ] },
  { heading: "Contact us", paragraphs: [
    "If you have questions about our use of cookies, contact us at privacy@civicsign.com or via our Contact page.",
  ] },
];

export default function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      updated="June 1, 2026"
      intro="This policy explains how CivicSign uses cookies and similar technologies, and how you can manage them."
      sections={sections}
    />
  );
}
