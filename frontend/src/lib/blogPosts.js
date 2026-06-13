// Centralised blog post data + helpers. Used as a "static fallback" when the
// /api/blog endpoint hasn't been seeded yet; admin-created posts via the
// internal team panel are merged in on top (API wins on slug conflicts).

import api from "@/lib/api";

export const POSTS = [
  {
    slug: "are-e-signatures-legal-in-the-uk",
    title: "Are electronic signatures legal in the UK in 2026?",
    excerpt: "The short answer is yes — and they have been since the Electronic Communications Act 2000. We walk through eIDAS, the Law Commission's 2019 report, and what actually counts as a valid e-signature on a UK contract.",
    category: "UK Law",
    date: "Feb 14, 2026",
    readTime: "6 min read",
    author: "CivicSign Editorial",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85",
    body: [
      { type: "p", content: "It's the question we get asked more than any other: are electronic signatures actually legal in the United Kingdom? The honest answer is that they have been legal for more than two decades — and they have been the default for most British businesses for at least the last five years. What's changed in 2026 is not whether they're legal, but how much weight different types of e-signature now carry in the eyes of UK courts, HM Land Registry, the ICO and HMRC." },
      { type: "h2", content: "The short version" },
      { type: "p", content: "Under section 7 of the Electronic Communications Act 2000, an electronic signature is admissible as evidence of authentication in UK court. The UK eIDAS Regulation (the on-shored version that survived Brexit) goes further and recognises three tiers of e-signature: simple, advanced and qualified. For 99% of contracts, a simple electronic signature is sufficient as long as the signing process is auditable and the signatory's intent is clear." },
      { type: "callout", content: "Bottom line: if your e-signature platform captures the signature, the date, the signer's identity (typically email + IP) and produces a tamper-evident audit trail, your signed PDF holds up in a UK court the same way a wet-ink signature does." },
      { type: "h2", content: "The three tiers under UK eIDAS" },
      { type: "ul", content: [
        "Simple Electronic Signature (SES): any data attached to or logically associated with the document that the signer uses to sign. A typed name, drawn signature or click-to-agree all count.",
        "Advanced Electronic Signature (AES): uniquely linked to the signer, capable of identifying them, created under their sole control, and detects subsequent changes to the document. CIVICSIGN's default sealed signature is an AES.",
        "Qualified Electronic Signature (QES): an AES backed by a qualified certificate from a Qualified Trust Service Provider. Required only for a narrow set of high-value transactions (e.g. some EU cross-border deeds).",
      ]},
      { type: "h2", content: "What the Law Commission said in 2019" },
      { type: "p", content: "The Law Commission's 2019 report on Electronic Execution of Documents was the watershed moment. It confirmed that electronic signatures are valid for documents that are required to be 'in writing' or 'signed' under English law, including most commercial contracts. Crucially, the Commission also confirmed that deeds — including deeds of variation, simple property deeds and many witnessed instruments — can be signed electronically provided the witnessing requirement is satisfied (i.e. the witness sees the signatory apply their electronic signature)." },
      { type: "h2", content: "When you still need a wet signature" },
      { type: "p", content: "A handful of UK documents still require a physical wet signature. The list is short and getting shorter every year. As of February 2026 it includes:" },
      { type: "ul", content: [
        "Wills under the Wills Act 1837 (though Law Commission consultation is ongoing).",
        "Certain HM Revenue and Customs documents where HMRC has not yet certified electronic equivalents.",
        "Lasting Powers of Attorney for registration with the Office of the Public Guardian (under review).",
        "A small number of statutory declarations and oaths.",
      ]},
      { type: "h2", content: "What this means for your business" },
      { type: "p", content: "For UK businesses sending NDAs, employment contracts, supplier agreements, engagement letters, tenancy agreements, sales memos, statutory notices, settlement agreements and the like — electronic signatures are not just legal, they are now the expected default. Refusing to accept them in 2026 is increasingly the position that needs defending, not the other way around." },
      { type: "p", content: "What matters in practice is the quality of your audit trail. A signed PDF on its own is not enough. You need: signer identity (email verified), IP address, timestamps for every interaction (sent, viewed, signed), a tamper-evident hash on the final document, and a Certificate of Completion that links it all together. CIVICSIGN includes all of this on every plan, including the free tier — because we think it should be table-stakes." },
      { type: "h2", content: "Further reading" },
      { type: "ul", content: [
        "Law Commission, Electronic execution of documents (2019)",
        "UK eIDAS Regulation (as on-shored)",
        "Electronic Communications Act 2000, section 7",
        "Law Society practice note on electronic signatures",
      ]},
    ],
  },
  {
    slug: "hm-land-registry-electronic-signatures-2026",
    title: "HM Land Registry & electronic signatures: what conveyancers need to know",
    excerpt: "Since July 2020 HM Land Registry has accepted electronic signatures on dispositionary deeds. Here's exactly what your audit trail needs to contain, plus a worked example of an electronically signed TR1.",
    category: "Real Estate",
    date: "Feb 07, 2026",
    readTime: "8 min read",
    author: "CivicSign Editorial",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa",
    body: [
      { type: "p", content: "If you ran a UK conveyancing practice in 2019, the path to completion involved couriers, wet ink and the post box. If you run one in 2026, you can complete a TR1 from your client's kitchen table over a video call. The thing that changed is a single Practice Guide from HM Land Registry, published in July 2020 and refined every year since. This is what you need to know." },
      { type: "h2", content: "Practice Guide 8: electronic signatures" },
      { type: "p", content: "HM Land Registry Practice Guide 8 sets out, in clear language, that the Registry will accept electronic signatures on dispositionary deeds (TR1, TR5, AP1, RX4, restrictions, charges) provided four conditions are met:" },
      { type: "ul", content: [
        "The signing platform records and validates the signature using an established process.",
        "Each signatory's identity is verified before they sign.",
        "Each signatory's signature is witnessed where required by law (e.g. on deeds).",
        "The conveyancer holding the signed document gives a certificate confirming the above.",
      ]},
      { type: "callout", content: "Translation: it's not the e-signature platform that gets to decide — it's you, the conveyancer, certifying that the platform's process met HM Land Registry's bar. So choose your platform like you'd choose your indemnity insurer." },
      { type: "h2", content: "Witnessing requirements" },
      { type: "p", content: "Deeds under English law must be witnessed. The Law Commission confirmed in 2019 that witnessing can take place electronically: the witness needs to physically see the signatory apply their signature. They do not need to be in the same room, provided the witness can clearly see the act of signing — usually via a video call." },
      { type: "p", content: "In CIVICSIGN, sequential signing makes this clean. You route the deed to the grantor first, then to the witness immediately after. Both signatures land on the same document, with the same audit trail, and the witness can attest in their own signature block that they observed the grantor sign electronically." },
      { type: "h2", content: "A worked example: signing a TR1 electronically" },
      { type: "p", content: "Here's how a typical TR1 flow looks in practice. You upload the prepared TR1 to your platform. You add four recipients in sequential order:" },
      { type: "ul", content: [
        "Recipient 1: Seller — places signature and date.",
        "Recipient 2: Seller's witness — places witness signature, name, address and occupation.",
        "Recipient 3: Buyer — places signature and date.",
        "Recipient 4: Buyer's witness — places witness signature, name, address and occupation.",
      ]},
      { type: "p", content: "The seller signs first while their witness watches over a video call. The platform routes to the witness, who confirms they observed the act of signing. Then the same flow with the buyer. The final PDF carries all four signatures, four IP addresses, four timestamps and a tamper-evident seal — exactly what Practice Guide 8 expects." },
      { type: "h2", content: "What goes into the conveyancer's certificate" },
      { type: "p", content: "When you submit the signed deed to HM Land Registry, you (the conveyancer) issue a certificate confirming the signing process. The certificate should state the date of signing, the identity verification method used (typically email + ID document check), and that the witnessing requirement was satisfied. CIVICSIGN's Certificate of Completion is designed to be attached to this — it contains every fact your certificate needs to reference." },
      { type: "h2", content: "When NOT to use electronic signatures" },
      { type: "p", content: "Practice Guide 8 does not apply to all property documents. Statutory declarations, some Stamp Duty Land Tax forms, and Lasting Powers of Attorney still require wet signatures (the latter pending review). When in doubt, check the latest version of Practice Guide 8 — HM Land Registry updates it regularly, and the trend is consistently towards more digital acceptance, not less." },
      { type: "h2", content: "Practical tips for property practices" },
      { type: "ul", content: [
        "Save your TR1, TR5 and AP1 templates once with fields pre-placed — every transaction takes seconds, not minutes.",
        "Always use sequential signing for deeds — it forces the witness to follow immediately after the signatory.",
        "Verify your client's identity through a certified IDSP before sending the signing link. Pair the resulting check with the e-signature.",
        "Keep the Certificate of Completion attached to the same case file — your file passes SRA monitoring with no effort.",
      ]},
    ],
  },
  {
    slug: "gift-aid-electronic-declarations-hmrc-guide",
    title: "Gift Aid via e-signature: the HMRC-friendly playbook for UK charities",
    excerpt: "How small charities can capture HMRC-compliant Gift Aid declarations at the door, online or via email — and what fields your audit trail needs to keep your annual return clean.",
    category: "Charities",
    date: "Jan 28, 2026",
    readTime: "5 min read",
    author: "CivicSign Editorial",
    image: "https://images.unsplash.com/photo-1593113598332-cd288d649433",
    body: [
      { type: "p", content: "For every £1 a UK taxpayer donates to a registered charity, HMRC will hand the charity 25p back through Gift Aid. Multiplied across a year's worth of donations, that uplift is the difference between hitting your fundraising target and missing it. Most small charities are leaving that money on the table because their Gift Aid declaration process is stuck in 2008." },
      { type: "h2", content: "What the law says" },
      { type: "p", content: "HMRC's detailed guidance on Gift Aid (Chapter 3 of the Charities guidance) is unambiguous: Gift Aid declarations can be made electronically — by tick-box, signed online form or email — provided the declaration contains the required information and you can produce evidence if HMRC asks for it during a compliance review." },
      { type: "p", content: "The required fields are straightforward:" },
      { type: "ul", content: [
        "Donor's full name.",
        "Donor's home address (just the house number/name and postcode is now sufficient).",
        "Charity name.",
        "Description of gift(s) the declaration covers (one-off, future and/or past).",
        "Donor's confirmation that they are a UK taxpayer paying enough Income Tax or Capital Gains Tax to cover the Gift Aid claimed.",
        "Date of the declaration.",
      ]},
      { type: "callout", content: "Every CIVICSIGN Gift Aid template includes these fields by default — drop it on a stewarding tablet at an event, or email the link to a regular donor, and you have an HMRC-compliant declaration in seconds." },
      { type: "h2", content: "The compliance audit trail HMRC actually wants" },
      { type: "p", content: "When HMRC opens a compliance review, they want to see two things: that the declaration existed at the time of the donation, and that the donor was identifiable. An electronic Gift Aid declaration handles both more cleanly than a paper one, because it carries an IP address, an email-verified identity and a precise timestamp — none of which a clipboard signature ever did." },
      { type: "p", content: "Keep the Certificate of Completion attached to your donor record. If HMRC ever asks 'how did you capture this declaration?', you can produce the answer in one click — not by digging through a filing cabinet in the church hall." },
      { type: "h2", content: "Where electronic Gift Aid really wins" },
      { type: "ul", content: [
        "At fundraising events: a steward holds a tablet, donor signs, declaration is in your CRM before they reach the buffet.",
        "Online donation flows: pair the donation form with an embedded Gift Aid signing link — conversion goes up because there's no separate paper step.",
        "Annual renewals: bulk-send renewal declarations to lapsed declarants — the ones who never sent the paper back will tap-and-sign on their phone.",
        "Major-donor relationship: bespoke declarations for higher-rate taxpayers feel polished and well-organised, not bureaucratic.",
      ]},
      { type: "h2", content: "Common Gift Aid mistakes" },
      { type: "p", content: "A handful of avoidable mistakes will get a Gift Aid claim rejected:" },
      { type: "ul", content: [
        "Missing the donor's home address. Workplace addresses are not sufficient.",
        "Pre-ticked Gift Aid boxes. The donor must take a positive action to opt in.",
        "Declarations without a date. The date determines when Gift Aid can start being claimed from.",
        "Not telling the donor what to do if they stop being a UK taxpayer or pay less tax in future. Include the standard HMRC wording verbatim.",
      ]},
      { type: "p", content: "If you set up your declaration once in CIVICSIGN with HMRC's verbatim wording, the donor cannot accidentally skip a field. The result: cleaner claims, fewer rejections, and 25% more for your cause." },
    ],
  },
  {
    slug: "right-to-work-digital-checks-uk-hr",
    title: "Digital Right to Work checks: the UK HR playbook",
    excerpt: "Since 2022 UK employers can use certified Identity Service Providers for Right to Work checks. Pair that with an electronically signed declaration and your statutory excuse holds up under inspection.",
    category: "HR & People",
    date: "Jan 21, 2026",
    readTime: "7 min read",
    author: "CivicSign Editorial",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902",
    body: [
      { type: "p", content: "Right to Work checks are the unglamorous bit of British HR that nobody likes doing — and the bit that gets you a £20,000 civil penalty per worker if you skip. In 2022 the Home Office finally accepted that the world had moved beyond passport photocopies, and certified the first Identity Service Providers (IDSPs) to perform Right to Work checks remotely. In 2026, doing it any other way is starting to look like a process problem." },
      { type: "h2", content: "What the Home Office actually accepts" },
      { type: "p", content: "There are now three routes to a compliant Right to Work check, depending on who you're hiring:" },
      { type: "ul", content: [
        "Manual check: in-person inspection of original documents from List A or List B, then a photocopy retained on file with date and signature.",
        "Online Home Office check: using the candidate's share code via the gov.uk service. Available for foreign nationals with current visas.",
        "Digital check via a certified IDSP: for British and Irish citizens holding a valid in-date passport. The IDSP verifies the document and the identity, then provides the employer with a proof of check.",
      ]},
      { type: "callout", content: "The IDSP route is the one most British HR teams should care about, because it removes the need to ever inspect a physical document for a UK or Irish national. The candidate uploads their passport to the IDSP from their phone, the IDSP returns a yes/no, and you keep the proof." },
      { type: "h2", content: "Where electronic signatures fit in" },
      { type: "p", content: "Whichever check route you use, you still need a Right to Work declaration signed by the candidate confirming the documents they've provided and authorising the check. Historically this was a paper form. In 2026 it's an electronic declaration with the IDSP confirmation attached." },
      { type: "p", content: "Pair the two and your statutory excuse looks like this: a timestamped electronic declaration from the candidate, an IDSP-issued proof of identity verification, and the photocopied/digital document(s) retained for the statutory period. Three artifacts, all in one digital file, retrievable in one click. Compare that with a paper-only process — paper declarations get lost, photocopies fade, and your statutory excuse is only as good as the filing cabinet it lives in." },
      { type: "h2", content: "How long do you need to keep the records?" },
      { type: "p", content: "Right to Work check records must be retained for the duration of the worker's employment plus two years after they leave. Failure to produce them on demand from an immigration officer is a sufficient basis for the civil penalty even if the worker did, in fact, have the right to work. The case for digital retention is open and shut." },
      { type: "h2", content: "The CIVICSIGN flow for new starters" },
      { type: "ul", content: [
        "Send the candidate the Right to Work declaration + employment contract in a single signing flow.",
        "Trigger the IDSP check from the candidate's phone in parallel. (We're rolling out integrations with certified providers later in 2026.)",
        "Receive both the signed declaration and the IDSP proof back into the candidate's HR file.",
        "Attach the Certificate of Completion to your single central record entry. Done.",
      ]},
      { type: "h2", content: "Common Right to Work mistakes that bin your statutory excuse" },
      { type: "ul", content: [
        "Photocopying documents without dating and signing the copy.",
        "Accepting a share code on the wrong gov.uk service (visa share codes vs Right to Rent are not the same).",
        "Not re-checking time-limited Right to Work (e.g. when a visa expires) — set a calendar reminder, or use a platform that does it for you.",
        "Treating an EU Settled Status share code as a Right to Work share code without the candidate proving status separately.",
      ]},
      { type: "p", content: "Get the basics right, automate the rest, and Right to Work compliance stops being the thing you panic about on the morning of an audit." },
    ],
  },
  {
    slug: "uk-gdpr-vs-eu-gdpr-saas-platforms",
    title: "UK GDPR vs. EU GDPR: what it actually means for your SaaS suppliers",
    excerpt: "Brexit changed less than most vendors will admit. We unpack the practical differences for British businesses choosing a UK-hosted SaaS — and why hosting really does matter for ICO enquiries.",
    category: "Compliance",
    date: "Jan 14, 2026",
    readTime: "9 min read",
    author: "CivicSign Editorial",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    body: [
      { type: "p", content: "There are two flavours of GDPR in 2026. There's UK GDPR — the on-shored version that lives alongside the Data Protection Act 2018 — and there's EU GDPR, which applies inside the EU and to organisations processing EU citizens' data. For most British businesses, the practical difference is small. For SaaS procurement, it's enormous." },
      { type: "h2", content: "The short version" },
      { type: "p", content: "UK GDPR and EU GDPR are still substantively the same regulation. The rights of data subjects, the principles, the lawful bases — all materially identical. The differences are in the supervisory authority (ICO vs the various EU DPAs), the adequacy mechanism between them, and the way each handles international transfers." },
      { type: "h2", content: "Adequacy: the most-asked, least-understood question" },
      { type: "p", content: "The European Commission granted the UK an adequacy decision in June 2021, which means EU personal data can flow to the UK without needing Standard Contractual Clauses or other transfer safeguards. The current adequacy decision runs until 2027 and is being reviewed in 2026. The political consensus is that it will be renewed — but the legal position is that it isn't permanent, and is contingent on the UK not diverging too far from EU rules." },
      { type: "p", content: "From the UK side, the Data Protection (Adequacy) Regulations 2021 named the EEA, Gibraltar and a handful of others as 'adequate'. Transfers from the UK to the EU are therefore unrestricted." },
      { type: "h2", content: "When hosting really matters" },
      { type: "callout", content: "For data subjects whose primary recourse is the ICO, having their data processed inside the UK simplifies everything — the controller, the processor, the regulator and the courts are all subject to the same legal system. There's no 'which supervisor do I write to first' dance." },
      { type: "p", content: "This is the substantive point. If your SaaS supplier processes UK personal data inside the UK, on UK infrastructure, the ICO is the single supervisory authority. If your SaaS supplier processes UK personal data inside the EU or US, the picture gets more complex: you've got at least two supervisory authorities to think about, transfer mechanisms to maintain, and sub-processor disclosures to track." },
      { type: "h2", content: "Sub-processors: the bit nobody reads" },
      { type: "p", content: "Most UK businesses sign a Data Processing Agreement with their SaaS supplier and never look at the sub-processor list. It's worth looking — that list tells you where your data actually lives. A 'UK-based' SaaS that runs on US infrastructure with US support, US ML pipelines and a US payments processor is, for data-residency purposes, primarily a US SaaS." },
      { type: "p", content: "CIVICSIGN's sub-processor list is published openly, kept short, and overwhelmingly UK/EU. We tell you exactly where every byte of your data sits. We think this should be a hygiene-level expectation for any UK SaaS." },
      { type: "h2", content: "International transfers under UK GDPR" },
      { type: "p", content: "If your SaaS supplier needs to transfer UK personal data outside the UK and outside the EEA, they must use an appropriate transfer mechanism: the UK's International Data Transfer Agreement (IDTA), the UK Addendum to EU Standard Contractual Clauses, or rely on a UK adequacy regulation if one covers the destination country." },
      { type: "p", content: "Practical advice for procurement teams: ask for the IDTA. Read the appendices. Confirm the destination country has adequacy or that the SCCs/IDTA are signed and dated. If your supplier can't produce these in one email, that tells you something about how much they care." },
      { type: "h2", content: "What 'UK GDPR compliant' should mean on a vendor's website" },
      { type: "ul", content: [
        "A published privacy notice that names the controller, the data, the lawful basis and the retention period.",
        "A signed UK-flavoured DPA available on request, with the IDTA where international transfers happen.",
        "A clear sub-processor list with locations and roles.",
        "Demonstrable security measures (encryption at rest and in transit, role-based access, audit logs).",
        "Named DPO or named privacy contact, with a UK address.",
      ]},
      { type: "p", content: "If a vendor's site says 'GDPR compliant' but won't say which GDPR, or hosts your data 'somewhere in our global cloud', proceed with care." },
    ],
  },
  {
    slug: "civicsign-launch-15-field-types",
    title: "Product update: 15 field types now live in the Prepare Studio",
    excerpt: "Stamp, image, dropdown, radio, attachment and auto-filled identity fields are all live. Here's what each one does and which industries asked us for them.",
    category: "Product Updates",
    date: "Feb 13, 2026",
    readTime: "3 min read",
    author: "CivicSign Product",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
    body: [
      { type: "p", content: "The Prepare Studio now ships with 15 field types out of the box. That covers every common UK signing scenario we've seen — and most of the uncommon ones. Here's the lineup and where each one earns its keep." },
      { type: "h2", content: "Signing fields" },
      { type: "ul", content: [
        "Signature — your headline event. Drawn, typed or uploaded.",
        "Initial — for paragraph-by-paragraph initialling on longer contracts.",
        "Sign date — auto-fills with today's date when the signer opens the document.",
      ]},
      { type: "h2", content: "Identity fields (auto-filled)" },
      { type: "p", content: "These pull from the recipient's email and profile data — the signer can correct them, but they shouldn't have to type them in." },
      { type: "ul", content: [
        "Full name — saves a typing step on every offer letter and tenancy agreement.",
        "Email — handy for double-confirming the address you're sending to.",
        "Company — useful on multi-party commercial contracts.",
        "Job title — used by HR, finance and supplier-onboarding flows.",
      ]},
      { type: "h2", content: "Form fields" },
      { type: "ul", content: [
        "Text — the workhorse free-text field.",
        "Date — any date, not just today's.",
        "Checkbox — single tick-box for opt-ins.",
        "Dropdown / Radio — guided choice. Senders type the placeholder for now; properly configurable option lists are coming next.",
      ]},
      { type: "h2", content: "Image-style fields" },
      { type: "ul", content: [
        "Stamp — the signer can upload a stamp image. Popular with surveyors and clinicians.",
        "Image — any signed-in image, e.g. a passport photo or proof-of-delivery snap.",
        "Attachment — the signer attaches a PDF or image to the envelope (e.g. ID document).",
      ]},
      { type: "h2", content: "Where they came from" },
      { type: "p", content: "Each field type came directly from customer requests. Stamp came from UK building surveyors. Image came from logistics. Dropdown and radio came from healthcare consent forms. Auto-filled identity fields came from HR teams tired of seeing 'PLEASE TYPE YOUR FULL LEGAL NAME HERE' filled with 'k'." },
      { type: "h2", content: "What's next" },
      { type: "ul", content: [
        "Configurable option lists for Dropdown and Radio fields, so senders can lock down the choices.",
        "Calculated fields (e.g. total of line-item fields) — coming with our Stripe integration.",
        "Conditional fields that appear only when a previous answer matches.",
      ]},
      { type: "p", content: "All 15 field types are available on every plan today — including the free tier. If you've been waiting for a specific field to send a particular type of document, give it a try and let us know how it lands." },
    ],
  },
];

export const CATEGORIES = ["All", "UK Law", "Real Estate", "Charities", "HR & People", "Compliance", "Product Updates"];

export const getPost = (slug) => POSTS.find((p) => p.slug === slug);
export const getRelatedPosts = (slug, limit = 2) => {
  const current = getPost(slug);
  if (!current) return [];
  return POSTS
    .filter((p) => p.slug !== slug)
    .sort((a, b) => (a.category === current.category ? -1 : 1) - (b.category === current.category ? -1 : 1))
    .slice(0, limit);
};

// API-merged list: returns static posts with admin-created posts overlaid.
// Used by the public /blog and /blog/:slug pages.
export async function fetchAllPosts() {
  try {
    const { data } = await api.get("/blog/posts");
    const apiBySlug = new Map(data.map((p) => [p.slug, p]));
    const merged = [...POSTS.map((p) => apiBySlug.get(p.slug) || p)];
    for (const p of data) {
      if (!merged.find((x) => x.slug === p.slug)) merged.unshift(p);
    }
    return merged;
  } catch {
    return POSTS;
  }
}

export async function fetchPost(slug) {
  try {
    const { data } = await api.get(`/blog/posts/${slug}`);
    return data;
  } catch {
    return getPost(slug);
  }
}
