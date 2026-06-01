# CIVICSIGN — plan.md

## 1) Objectives
- Research + distill how leading e-sign platforms (DocuSign/Zoho Sign) implement: prep → routing → signing → audit → finalization.
- Prove the **core, failure-prone workflow** in isolation: doc conversion + field coordinate mapping + PDF stamping + certificate/audit + email delivery.
- Build CIVICSIGN V1 MVP (FARM stack) around the proven core: sender dashboard, doc prep studio, send, signer experience, tracking, completion package.
- Add authentication (email/pw JWT + Emergent Google OAuth) after core flows work end-to-end.

## 2) Implementation Steps

### Phase 1 — CORE POC (Isolation) ✅ COMPLETE — ALL 6 CORE STEPS PASSED
**Status:** `/app/poc/poc_signing.py` runs green. Proven: DOCX→PDF (LibreOffice), typed/drawn/uploaded signature PNG generation, percentage-coordinate stamping of signature/text/date/checkbox onto multi-page PDF (PyMuPDF, top-left origin matches pdf.js), tamper-evident SHA-256 hash, appended Certificate of Completion + audit trail, and SendGrid send path (skip-mode until key provided). Visual verification confirmed correct placement near signature lines.
**Goal:** one runnable Python script that produces a finalized “completed package” and can email it.

**User stories (POC)**
1. As a builder, I can convert a DOCX into a PDF deterministically.
2. As a builder, I can stamp a signature image onto a PDF at **percentage-based coordinates** across pages.
3. As a builder, I can stamp typed text/date/checkbox marks similarly.
4. As a builder, I can append a Certificate of Completion page with event log + IP + timestamps.
5. As a sender, I can email a signer a secure link and send the completed PDF as an attachment (if keys are configured).

**Steps**
- Websearch best practices: PDF coordinate systems (pdf.js vs PyMuPDF), PNG transparency, LibreOffice headless DOCX→PDF fidelity.
- Create `/poc/poc_signing.py`:
  - Input: `sample.pdf` and `sample.docx`.
  - Convert DOCX→PDF via LibreOffice headless.
  - Define fields using `{page, type, rect_pct: {x,y,w,h}, value, assignee}`.
  - Render/produce signature PNGs:
    - Draw: pre-made PNG fixture.
    - Type: render text to PNG (Pillow) with selectable font.
    - Upload: fixture PNG.
  - Stamp onto PDF with PyMuPDF using pct→absolute mapping.
  - Generate audit events JSON + append “Certificate of Completion” page (reportlab or PyMuPDF).
  - Output: `completed.pdf` + `audit.json`.
  - Optional: SendGrid email send:
    - Email signer link.
    - Email sender completion notice with `completed.pdf` attachment.
- Iterate until POC passes on multi-page PDFs and fields on different pages.

**Success criteria (POC must all pass)**
- DOCX converts to PDF with acceptable layout fidelity.
- Stamps land correctly at expected locations regardless of zoom/render size.
- Completed PDF opens in common viewers and contains stamped artifacts + appended certificate.
- Audit log includes intent/consent placeholders, timestamps, IP, and action list.
- SendGrid emails send successfully when `SENDGRID_API_KEY` + verified sender are present.

---

### Phase 2 — V1 App Development (MVP, core first; auth deferred)
**Status:** BUILT & in testing. Backend (FastAPI+MongoDB+GridFS): auth (email/pw JWT + Emergent Google), envelopes CRUD, DOCX/PDF upload+convert, recipients, fields (percentage coords), send (SendGrid skip-mode + shareable links), tokenized signer flow (view/submit/decline), background finalization (stamp + Certificate of Completion + SHA-256), audit trail, stats. Frontend (React+react-pdf): Landing, Login/Register+Google, AuthCallback, Dashboard (stats+chart+table), NewEnvelope (upload), PrepareStudio (PDF render + click-to-place fields, drag/resize, recipients, signing order), SendReview (shareable links), EnvelopeDetail (tracking timeline + audit + doc viewer + download), SignerFlow (consent gate + draw/type/upload signature + guided fields + finish/decline). Backend E2E smoke test passed; studio verified in browser.
**Goal:** working signing flow without requiring sender accounts yet (use a temporary “demo sender” mode).

**User stories (V1 core, no auth)**
1. As a sender, I can upload a PDF or DOCX and see it rendered in the browser.
2. As a sender, I can add recipients and set signing order (sequential/parallel).
3. As a sender, I can drag/drop fields (signature/initial/date/text/checkbox) and assign each to a recipient.
4. As a signer, I can open a secure link without an account, complete only my fields, and finish.
5. As a sender, I can see status updates and download the finalized PDF + certificate.

**Backend (FastAPI + MongoDB)**
- Data model: users (later), documents, envelopes, recipients, fields, signing_sessions, audit_events.
- File pipeline:
  - Upload endpoint; store original + normalized PDF.
  - DOCX→PDF conversion service (LibreOffice).
  - Field coordinate storage as percentages.
  - Finalization endpoint that uses the proven POC module for stamping + certificate.
- Signing links:
  - Tokenized, time-bound signer link per recipient (no login).
  - Endpoints: get envelope for signer, submit field values, complete.
- Status tracking:
  - Envelope state machine: draft → sent → viewed → signed(partial) → completed/declined.
  - Audit event writes on each action (view, sign, decline, complete).
- Email:
  - SendGrid transactional emails for invite + reminders (v1: invite + completion only).

**Frontend (React)**
- Bold/fresh design system (distinct palette, strong typography, crisp spacing).
- Screens:
  - Upload + envelope creation wizard.
  - Prep Studio: react-pdf viewer + field palette + recipient assignment panel.
  - Send screen: recipients list + signing order + “Send” + shareable links.
  - Signer UI: PDF viewer + guided field completion; signature modal (draw/type/upload).
  - Sender tracking: real-time-ish polling for status + download completed docs.

**End of Phase 2: Testing**
- Run 1 full E2E test: upload DOCX→convert→prepare→send→sign as 2 recipients→complete→download.

**Success criteria (V1)**
- End-to-end completion works for PDF and DOCX sources.
- Field placement is accurate and consistent.
- Signer can draw/type/upload signature; submission locks fields.
- Final PDF contains all marks + certificate; sender can download.

---

### Phase 3 — Add Authentication + Templates + Hardening
**Goal:** production-ready sender accounts, templates, and reliability improvements.

**User stories (Phase 3)**
1. As a sender, I can sign up/log in with email/password and stay logged in via httpOnly cookies.
2. As a sender, I can log in with Google (“Continue with Google”) and my account links by email.
3. As a sender, I can save an envelope as a reusable template.
4. As a sender, I can reuse templates to send faster.
5. As a sender, I can resend invites and see delivery outcomes.

**Steps**
- Implement email/password JWT auth (bcrypt + access/refresh cookies) + seeded admin for testing.
- Implement Emergent Google OAuth flow (session_id exchange server-side) and account linking by email.
- Add templates: store PDF + field definitions + recipient roles.
- Add resend/reminder endpoints + basic rate limiting.
- Improve audit trail completeness (consent text, signer user-agent, hashing of finalized PDF).

**End of Phase 3: Testing**
- Test: auth flows (email/pw + Google), template reuse, and full signing flow under authenticated sender.

**Success criteria (Phase 3)**
- Auth-gated dashboard stable; Google callback race conditions avoided.
- Templates reliably reproduce field layouts.
- Email resend/reminder works; envelope lifecycle remains consistent.

---

### Phase 4+ — Competitive Enhancements
**User stories (Phase 4+)**
1. As a sender, I can bulk send the same template to many recipients.
2. As a sender, I can configure reminders and expiry dates.
3. As a sender, I can add advanced fields (dropdowns, radio, validations).
4. As a sender, I can collect payments or IDs before signing (optional).
5. As an admin, I can view analytics (time-to-sign, completion rate) and manage org settings.

**Focus items**
- Bulk send, reminders/scheduler, advanced fields/validation.
- In-person signing mode.
- Stronger tamper-evidence: doc hash chaining + WORM-like audit storage.
- Optional webhooks + integrations (Zapier-style).

## 3) Next Actions
- Confirm you can provide: `SENDGRID_API_KEY` + verified `SENDER_EMAIL` (or we run email tests in “skip mode”).
- I will implement Phase 1 POC script first and run it until it passes.
- Once POC passes, I’ll build Phase 2 MVP app around the proven stamping/conversion module.

## 4) Success Criteria (overall)
- CIVICSIGN supports PDF + DOCX upload, accurate field placement, multi-recipient routing, no-account signing links, and produces a finalized signed PDF + certificate.
- Meets baseline ESIGN/eIDAS expectations: intent/consent capture, association, retention, tamper-evident audit trail.
- Sender experience is fast and polished; signer flow is frictionless; UI is bold/fresh and coherent.
