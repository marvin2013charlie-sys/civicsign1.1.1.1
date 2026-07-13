import { formatFreePlanDocsPerMonth, formatFreePlanDocsShort } from "@/lib/pricing";

/**
 * Extended copy for /solutions hub and industry pages — workflows, FAQs, testimonials.
 */

export const SOLUTIONS_HUB_STATS = [
  { value: "11", label: "UK industry playbooks", color: "#2DD4BF" },
  { value: "500k+", label: "Documents prepared", color: "#2DD4BF" },
  { value: "100%", label: "UK-owned & hosted", color: "#2DD4BF" },
  { value: "< 3 min", label: "Avg. time to sign", color: "#FF7A5C" },
];

export const SOLUTIONS_HUB_FAQS = [
  [
    "Do I need a different CivicSign account per industry?",
    "No. One account works across every workflow. Industry pages show which document types and compliance notes matter most for your sector — templates and fields are yours to configure.",
  ],
  [
    "Are signatures legally binding for my industry?",
    "CivicSign is built around UK law — the Electronic Communications Act 2000, UK eIDAS, and sector guidance (Law Commission, HMRC, Home Office, CQC, and others referenced on each page). Every completed document includes a tamper-evident audit trail.",
  ],
  [
    "Can signers complete documents on a phone?",
    "Yes. Recipients sign via a secure link on any device. No account or app download required — ideal for tenants, candidates, patients, parents and clients on the move.",
  ],
  [
    "Is CivicSign UK GDPR compliant?",
    "Yes. CivicSign is UK-owned and UK-hosted. Personal data is processed under UK GDPR with encryption in transit, role-based access for teams, and clear data-subject rights.",
  ],
  [
    "Can we use templates for repeat documents?",
    "Absolutely. Save your AST, offer letter, engagement pack or RAMS as a reusable template. Place fields once, send in seconds on every new matter, hire or job.",
  ],
  [
    "What if we need organisation-wide controls?",
    "Organisation plans give enterprise clients pooled document allowances, admin invite-by-email, per-member limits and contract visibility. Contact us or explore Organisation in the app after your owner account is provisioned.",
  ],
];

export const SECURITY_POINTS = [
  { t: "Intent & consent", d: "Signers explicitly consent to do business electronically before signing." },
  { t: "Attribution", d: "Each signature is linked to an email, timestamp and IP address." },
  { t: "Tamper-evidence", d: "Finalised documents are sealed with a SHA-256 hash — any change is detectable." },
  { t: "Certificate of Completion", d: "A chronological audit trail is appended to every completed document." },
];

export const SOLUTIONS_HUB_STEPS = [
  { n: "1", t: "Upload", d: "PDF or Word — rendered instantly in your browser.", ring: "#2DD4BF" },
  { n: "2", t: "Prepare", d: "Drag fields, set signing order, add your message.", ring: "#7AC9BE" },
  { n: "3", t: "Seal", d: "Completed PDF with Certificate of Completion.", ring: "#FF7A5C" },
];

/** Curated quotes for the /solutions hub — one per sector cluster. */
export const SOLUTIONS_HUB_TESTIMONIALS = [
  {
    quote: "We replaced wet signatures on ASTs in a week. Tenants sign from their phone and we close lets the same day we send the contract.",
    name: "James Okonkwo",
    role: "Lettings Manager, Harbor & Co",
    initials: "JO",
    color: "#14B8A6",
    industry: "Real Estate",
  },
  {
    quote: "Engagement letters that used to take a week now come back the same afternoon. The audit trail gave our COLP instant comfort.",
    name: "David Okafor",
    role: "Head of Legal, Brightwave",
    initials: "DO",
    color: "#FF7A5C",
    industry: "Legal",
  },
  {
    quote: "Trip consent used to mean a folder of half-signed slips. Now we know exactly who is coming before the coach is booked.",
    name: "Helen Wright",
    role: "School Business Manager, Northwind Studio MAT",
    initials: "HW",
    color: "#FF7A5C",
    industry: "Education",
  },
];

export const SOLUTIONS_HUB_SWITCH = [
  { before: "Print, post and chase wet signatures", after: "Send a link — signed in minutes on any device" },
  { before: "No proof of who signed or when", after: "Certificate of Completion with IP, timestamp and consent" },
  { before: "Re-type the same contract every time", after: "Reusable templates with fields pre-placed" },
  { before: "Chase signers by phone and email", after: "Automatic reminders until every party completes" },
];

const CONTENT = {
  "/solutions/real-estate": {
    workflowHeadline: "From instruction to keys",
    workflowSubhead: "How UK agents close lets and sales without the printer.",
    workflows: [
      { step: "01", title: "Instruct & prepare", body: "Upload your AST or memorandum of sale. Drag signature, date and initial fields onto the right pages." },
      { step: "02", title: "Route signers", body: "Add tenant, landlord, buyer or guarantor. Choose parallel or sequential order for chains." },
      { step: "03", title: "Track & chase", body: "See who has viewed and signed. Automatic reminders nudge anyone still outstanding." },
      { step: "04", title: "Seal & file", body: "Download the completed PDF with Certificate of Completion — ready for your CRM or compliance file." },
    ],
    testimonial: {
      quote: "We replaced wet signatures on ASTs in a week. Tenants sign from their phone and we close lets the same day we send the contract.",
      name: "James Okonkwo",
      role: "Lettings Manager, Harbor & Co",
      initials: "JO",
      color: "#14B8A6",
    },
    faqs: [
      ["Are electronic AST signatures valid in England and Wales?", "Yes. Assured Shorthold Tenancy agreements can be executed electronically when intent, consent and attribution are evidenced. CivicSign's audit trail is designed for that purpose under UK eIDAS and the Electronic Communications Act 2000."],
      ["Can we serve Section 21 notices electronically?", "Many agents use CivicSign to deliver statutory notices with timestamped delivery evidence. Always confirm your specific notice type against current legislation and seek legal advice for high-stakes possession proceedings."],
      ["Do tenants need a CivicSign account?", "No. Tenants, landlords and guarantors sign through a secure link on any device — no download required."],
      ["Can we add our agency branding?", "Yes. Pro and Business plans include custom branding — your logo, colours and signing-page banner on every envelope."],
    ],
  },
  "/solutions/construction": {
    workflowHeadline: "Quote to handover",
    workflowSubhead: "Paperless signing for trades on site and in the van.",
    workflows: [
      { step: "01", title: "Quote on site", body: "Photograph the job, upload your quote PDF from your phone and add a deposit-acceptance signature field." },
      { step: "02", title: "Contract & RAMS", body: "Send JCT short-form contracts and method statements. Operatives acknowledge risk before stepping on site." },
      { step: "03", title: "Variations", body: "Client signs variation orders electronically — margins protected, disputes reduced." },
      { step: "04", title: "Handover", body: "Snagging sign-off and retention release captured with a sealed audit trail." },
    ],
    testimonial: {
      quote: "I send quotes from the van and get deposits before I drive to the next job. RAMS signatures are in one place when the HSE asks.",
      name: "Tom Fletcher",
      role: "Director, BuildRight Ltd",
      initials: "TF",
      color: "#FF7A5C",
    },
    faqs: [
      ["Can subcontractors sign RAMS on a phone?", "Yes. Operatives open the link on any smartphone, read the method statement and sign before starting work — timestamp and IP logged for CDM records."],
      ["Are electronic JCT contracts enforceable?", "Electronic contracts are valid under UK law when parties demonstrate intent to be bound. CivicSign captures consent, identity and a tamper-evident completion record."],
      ["Does this work for CIS subcontractors?", "You can capture CIS declarations and UTR confirmations as part of your onboarding pack, with everything stored against the subcontractor record."],
      ["What about poor mobile signal on site?", "Signers can open the link when they have connectivity. Partial progress is saved; reminders follow up automatically."],
    ],
  },
  "/solutions/legal": {
    workflowHeadline: "Matter to signed retainer",
    workflowSubhead: "How UK firms stop chasing engagement letters.",
    workflows: [
      { step: "01", title: "Prepare matter pack", body: "Upload engagement letter, NDA or deed. Apply your firm's template with pre-placed fields." },
      { step: "02", title: "Route parties", body: "Sequential signing for witnessed deeds — client first, witness second, then counter-signature." },
      { step: "03", title: "Client signs remotely", body: "Clients complete on any device. No portal login — reduces friction and speeds instruction." },
      { step: "04", title: "File & bill", body: "Sealed PDF and Certificate of Completion drop into your matter file. Bill earlier, write off less." },
    ],
    testimonial: {
      quote: "Engagement letters that used to take a week now come back the same afternoon. The audit trail gave our COLP instant comfort.",
      name: "David Okafor",
      role: "Head of Legal, Brightwave",
      initials: "DO",
      color: "#FF7A5C",
    },
    faqs: [
      ["Are electronic signatures valid on UK deeds?", "The Law Commission's 2019 report confirms deeds can be executed electronically when the process demonstrates intent and is properly auditable. CivicSign's Certificate of Completion is built for that evidential standard."],
      ["How does witness routing work?", "Set sequential signing order: signatory signs first, witness receives the document next. Both signatures and timestamps appear on the final audit trail."],
      ["Is client confidentiality protected?", "Data is processed under UK GDPR on UK-hosted infrastructure. Role-based access limits who in your firm can view matter documents."],
      ["Can we integrate with our DMS?", "Business plans include API access and webhooks to notify your systems when envelopes complete. Contact us for enterprise integrations."],
    ],
  },
  "/solutions/financial-services": {
    workflowHeadline: "Prospect to engaged client",
    workflowSubhead: "Onboard clients before filing season bites.",
    workflows: [
      { step: "01", title: "Engagement pack", body: "Send engagement letter, terms, AML declaration and 64-8 authority in one envelope." },
      { step: "02", title: "AML evidence", body: "Capture source-of-funds and PEP declarations with timestamped IP — MLR 2017 file ready." },
      { step: "03", title: "Mandates", body: "Direct debit and HMRC agent authorisations signed before you submit to portals." },
      { step: "04", title: "Ongoing variations", body: "Scope changes and fee uplifts signed in writing — protect realisation rates." },
    ],
    testimonial: {
      quote: "Client onboarding used to mean chasing scanned PDFs. Now engagement letters and AML forms come back signed before we open the tax software.",
      name: "Priya Shah",
      role: "Partner, Ledgerly Finance",
      initials: "PS",
      color: "#14B8A6",
    },
    faqs: [
      ["Are electronic engagement letters accepted by ICAEW?", "ICAEW and ACCA permit electronically signed engagement letters when you can evidence client identity and agreement date. CivicSign provides IP, timestamp and email verification on every completion."],
      ["Can clients sign 64-8 authorities electronically?", "Many practices capture client authorisation electronically before submitting to HMRC. CivicSign gives you a sealed record of what the client agreed and when."],
      ["How does AML evidence work?", "Include AML and source-of-funds fields in your onboarding pack. Each action is logged with timestamp and IP for MLR 2017 reviews."],
      ["Can we bulk-send to a client list?", "Business plan bulk send lets you personalise and dispatch engagement packs to many clients at once — ideal for annual renewals."],
    ],
  },
  "/solutions/staffing-agency": {
    workflowHeadline: "Candidate to placed",
    workflowSubhead: "Contracts signed before the candidate leaves your desk.",
    workflows: [
      { step: "01", title: "Client terms", body: "Get terms of business and PSL agreements signed before the first CV goes out." },
      { step: "02", title: "Candidate pack", body: "Employment contract, RTW declaration and GDPR consent in one send." },
      { step: "03", title: "Umbrella routing", body: "Multi-party sequential signing for umbrella and end-client schedules." },
      { step: "04", title: "Placement file", body: "Every signed document sealed and searchable for audits and tribunals." },
    ],
    testimonial: {
      quote: "We place contractors faster because contracts come back signed in hours, not days. Right to Work evidence is always in the file.",
      name: "Elena Morris",
      role: "Operations Director, Apex Recruitment",
      initials: "EM",
      color: "#122120",
    },
    faqs: [
      ["Can candidates sign on a phone at the interview?", "Yes. Send the contract in the interview room; candidates sign before they leave — dramatically cutting time-to-place."],
      ["How do you handle Right to Work?", "Capture RTW declarations alongside ID-check evidence. Timestamped audit trail supports Home Office compliant processes."],
      ["Can we brand envelopes for each client?", "Pro and Business plans let you apply your agency branding. White-label the signing experience for premium clients."],
      ["Does CivicSign support IR35 contract packs?", "Save your IR35-aware contract templates and send with pre-placed fields for role, rate, start date and signatures."],
    ],
  },
  "/solutions/hr": {
    workflowHeadline: "Offer to first day",
    workflowSubhead: "HR packs that sign themselves.",
    workflows: [
      { step: "01", title: "Offer letter", body: "Send from the interview room. Candidate countersigns electronically — start date confirmed faster." },
      { step: "02", title: "Contract & RTW", body: "Employment contract, policies and Right to Work declaration in one envelope." },
      { step: "03", title: "Line manager sign-off", body: "Sequential routing for probation confirmations and role variations." },
      { step: "04", title: "Leaver pack", body: "Settlement agreements and resignation acknowledgements with full tribunal-ready audit trail." },
    ],
    testimonial: {
      quote: "New starters used to wait days for signed contracts. Now HR sends the pack on offer day and we have a complete file before day one.",
      name: "Sara Liang",
      role: "HR Director, Tertia",
      initials: "SL",
      color: "#122120",
    },
    faqs: [
      ["Are electronic employment contracts binding?", "Yes, when parties demonstrate intent to contract electronically. CivicSign captures consent, signature, timestamp and identity evidence."],
      ["Can we bulk-send offer letters?", "Business bulk send lets you dispatch personalised offer packs to a cohort — ideal for seasonal hiring or graduate intakes."],
      ["How do leaver settlements work?", "Use sequential signing: employee, adviser, then employer. Every party's signature appears on the sealed completion certificate."],
      ["Is employee data UK GDPR compliant?", "Yes. UK-hosted processing, role-based access and audit logs support ICO expectations for HR records."],
    ],
  },
  "/solutions/healthcare": {
    workflowHeadline: "Appointment to consent",
    workflowSubhead: "Clinical paperwork without the chart chase.",
    workflows: [
      { step: "01", title: "Pre-visit send", body: "Email consent and registration forms before the appointment — patients sign from home." },
      { step: "02", title: "Clinician review", body: "See confirmation in the portal before the patient arrives. No missing forms at reception." },
      { step: "03", title: "Care plans", body: "Service-user and family signatures on care plans with CQC-ready audit trail." },
      { step: "04", title: "Staff compliance", body: "DBS declarations and safeguarding training acknowledgements in bulk for your team." },
    ],
    testimonial: {
      quote: "Pre-appointment consent forms transformed our clinic flow. Patients arrive with paperwork done; clinicians focus on care.",
      name: "Dr Amara Patel",
      role: "Clinical Lead, Cedar Health",
      initials: "AP",
      color: "#14B8A6",
    },
    faqs: [
      ["Is electronic patient consent GMC-compliant?", "GMC guidance permits electronic written consent when patients have time to consider information and signatures are verifiable. CivicSign logs view, consent and signature events."],
      ["How is special-category health data protected?", "Processed under UK GDPR Article 9 lawful bases with UK hosting, encryption in transit and strict access controls."],
      ["Can care homes use this for CQC inspections?", "Signed care plans, safeguarding forms and staff attestations are timestamped and instantly retrievable for inspection."],
      ["Do patients need an account?", "No. Patients sign via a secure link — important for elderly users and low-digital-literacy populations."],
    ],
  },
  "/solutions/education": {
    workflowHeadline: "Term to permission",
    workflowSubhead: "School office paperwork that parents actually return.",
    workflows: [
      { step: "01", title: "Bulk consent", body: "Send trip permission to every parent in one go. Track who has signed in real time." },
      { step: "02", title: "Chase reminders", body: "Automatic reminders before the deadline — no more chasing crumpled slips in bags." },
      { step: "03", title: "Staff onboarding", body: "Contracts, SCR declarations and safeguarding attestations for new teachers." },
      { step: "04", title: "MAT rollout", body: "Shared templates across every school in your trust — consistent, audited, Ofsted-ready." },
    ],
    testimonial: {
      quote: "Trip consent used to mean a folder of half-signed slips. Now we know exactly who is coming before the coach is booked.",
      name: "Helen Wright",
      role: "School Business Manager, Northwind Studio MAT",
      initials: "HW",
      color: "#FF7A5C",
    },
    faqs: [
      ["Can we send consent forms to all parents at once?", "Business bulk send lets you dispatch personalised permission forms to hundreds of families and track completion live."],
      ["Is this suitable for multi-academy trusts?", "Yes. Share templates across schools, apply trust branding and maintain central visibility of completion rates."],
      ["Are electronic parental consents valid?", "Schools routinely use electronic consent where parents can demonstrate agreement. CivicSign provides timestamped evidence of who signed and when."],
      ["How does KCSIE documentation work?", "Capture safeguarding declarations and SCR entries with audit trails designed for Ofsted and DfE scrutiny."],
    ],
  },
  "/solutions/sales": {
    workflowHeadline: "Proposal to signed order",
    workflowSubhead: "How UK revenue teams close before the buyer goes cold.",
    workflows: [
      { step: "01", title: "Quote in the room", body: "Upload your proposal PDF, pre-place signature and date fields, send while interest is highest." },
      { step: "02", title: "Route stakeholders", body: "Add economic buyer, legal and finance. Parallel or sequential signing for multi-party deals." },
      { step: "03", title: "Chase automatically", body: "See who viewed and signed. Reminders nudge anyone still outstanding before quarter-end." },
      { step: "04", title: "Seal & sync", body: "Download the completed PDF with Certificate of Completion — attach to CRM opportunity or hand to finance." },
    ],
    testimonial: {
      quote: "We used to lose deals in the 'waiting for legal to sign' gap. Now proposals come back the same afternoon and our close rate actually moved.",
      name: "Maya Chen",
      role: "COO, Northwind Studio",
      initials: "MC",
      color: "#14B8A6",
    },
    faqs: [
      ["Are electronic signatures valid on B2B sales contracts?", "Yes. Under the Electronic Communications Act 2000 and UK eIDAS, electronic signatures are admissible and enforceable for most commercial agreements when intent and attribution are evidenced. CivicSign's audit trail is designed for that standard."],
      ["Can we send NDAs before a product demo?", "Absolutely. Mutual and one-way NDAs are among the most common sales envelopes. Recipients sign via a secure link — no account required."],
      ["Do enterprise buyers accept electronic order forms?", "Most procurement teams accept e-signatures when presented with a Certificate of Completion showing consent, email verification and timestamps. Offer AES on Business-tier workflows if they need stronger identity binding."],
      ["Can we reuse quote templates?", "Yes. Save your MSA, order form and proposal as templates with fields pre-placed. Duplicate per deal and swap client name, value and dates in seconds."],
    ],
  },
  "/solutions/freelancers": {
    workflowHeadline: "Brief to paid invoice",
    workflowSubhead: "Onboard clients in ten minutes, not ten emails.",
    workflows: [
      { step: "01", title: "Upload your MSA", body: "Save your standard contract template with signature, rate and start-date fields already placed." },
      { step: "02", title: "Personalise & send", body: "Duplicate per client, swap name and project details, send a secure signing link from your laptop or phone." },
      { step: "03", title: "Client signs anywhere", body: "No printer, no account. Clients draw, type or upload a signature on any device." },
      { step: "04", title: "File for tax time", body: "Sealed PDF and Certificate of Completion stored against the project — one envelope ID for your accountant." },
    ],
    testimonial: {
      quote: "I send SOWs from my kitchen table and clients sign before I finish my coffee. Finally looks as professional as the work I deliver.",
      name: "Sara Liang",
      role: "Founder, Tertia",
      initials: "SL",
      color: "#122120",
    },
    faqs: [
      ["Can sole traders use electronic signatures on client contracts?", "Yes. Electronic signatures are valid for consultancy agreements, SOWs and MSAs under UK law. Sign in your legal name as a sole trader, or in company capacity if you trade through a Ltd."],
      ["Is the free tier enough for freelancers?", `The free plan includes ${formatFreePlanDocsPerMonth()} with full audit trail and Certificate of Completion — enough to try with real clients. Upgrade to Pro when volume grows.`],
      ["Can I assign intellectual property electronically?", "IP assignment clauses and moral rights waivers can be executed electronically like any other contract term. CivicSign seals the final PDF so changes are detectable."],
      ["What if a client insists on wet ink?", "Point them to the Law Commission's 2019 report on electronic execution and share a sample Certificate of Completion. Most objections fade once legal sees the audit trail."],
    ],
  },
  "/solutions/charities": {
    workflowHeadline: "Donor to declaration",
    workflowSubhead: "Capture Gift Aid while enthusiasm is high.",
    workflows: [
      { step: "01", title: "Event capture", body: "Stewards collect Gift Aid on a phone or tablet at the door — donor signs in seconds." },
      { step: "02", title: "Email confirmation", body: "Donor receives confirmation instantly. HMRC-required fields stored against the record." },
      { step: "03", title: "Volunteer onboarding", body: "Volunteer agreements and DBS undertakings signed before the first shift." },
      { step: "04", title: "Trustee governance", body: "Written resolutions and minutes captured without a physical board meeting." },
    ],
    testimonial: {
      quote: "Gift Aid declarations at events went from paper slips in a shoebox to signed records in our inbox before the donor left the hall.",
      name: "Rachel Byrne",
      role: "Fundraising Manager, Owens & Price Charity",
      initials: "RB",
      color: "#14B8A6",
    },
    faqs: [
      ["Does HMRC accept electronic Gift Aid declarations?", "Yes. HMRC permits electronic declarations provided you retain donor name, address, gift details and the required confirmation. CivicSign captures all fields with a sealed audit trail."],
      ["Is there a charity discount?", `Small charities can start on the free tier (${formatFreePlanDocsShort()}). Contact us for registered-charity pricing on paid plans.`],
      ["Can trustees sign resolutions remotely?", "Yes. Trustees sign written resolutions electronically with timestamps suitable for Charity Commission governance records."],
      ["How do we protect beneficiary data?", "UK GDPR controls, role-based access and UK hosting help safeguard donor, volunteer and beneficiary information."],
    ],
  },
};

export function getSolutionExtras(solutionPath) {
  return CONTENT[solutionPath] || null;
}