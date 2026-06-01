# CIVICSIGN — plan.md

## 1) Objectives
- Research + distill how leading e-sign platforms (DocuSign/Zoho Sign) implement: prep → routing → signing → audit → finalization.
- Prove the **core, failure-prone workflow** in isolation: doc conversion + field coordinate mapping + PDF stamping + certificate/audit + email delivery.
- Build CIVICSIGN V1 MVP (FARM stack) around the proven core: sender dashboard, doc prep studio, send, signer experience, tracking, completion package.
- Add authentication (email/pw JWT + Emergent Google OAuth) after core flows work end-to-end.
- Add competitive “platform” features: templates, bulk send, reminders, expiry, admin oversight, and user account settings.
- Remove Emergent branding/badge and make CIVICSIGN fully white-label.

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

### Phase 2 — V1 App Development (MVP, core first; auth deferred) ✅ COMPLETE
**Status:** BUILT & VERIFIED. Backend (FastAPI+MongoDB+GridFS): auth (email/pw JWT + Emergent Google), envelopes CRUD, DOCX/PDF upload+convert, recipients, fields (percentage coords), send (SendGrid skip-mode + shareable links), tokenized signer flow (view/submit/decline), background finalization (stamp + Certificate of Completion + SHA-256), audit trail, stats. Frontend (React+react-pdf): Landing, Login/Register+Google, AuthCallback, Dashboard (stats+chart+table), NewEnvelope (upload), PrepareStudio (PDF render + click-to-place fields, drag/resize, recipients, signing order), SendReview (shareable links), EnvelopeDetail (tracking timeline + audit + doc viewer + download), SignerFlow (consent gate + draw/type/upload signature + guided fields + finish/decline). MVP E2E pass achieved.
**Goal:** working signing flow: upload → prepare → send → sign → finalize → download.

**User stories (V1 core)**
1. As a sender, I can upload a PDF or DOCX and see it rendered in the browser.
2. As a sender, I can add recipients and set signing order (sequential/parallel).
3. As a sender, I can drag/drop fields (signature/initial/date/text/checkbox) and assign each to a recipient.
4. As a signer, I can open a secure link without an account, complete only my fields, and finish.
5. As a sender, I can see status updates and download the finalized PDF + certificate.

**End of Phase 2: Testing**
- Full E2E: upload DOCX→convert→prepare→send→sign as 2 recipients→complete→download.

**Success criteria (V1)**
- End-to-end completion works for PDF and DOCX sources.
- Field placement is accurate and consistent.
- Signer can draw/type/upload signature; submission locks fields.
- Final PDF contains all marks + certificate; sender can download.

---

### Phase 3 — Authentication + Templates + Power Features ✅ COMPLETE — VERIFIED (iteration_2.json)
**Status:** DONE & TESTED. Backend + Frontend fully integrated. Phase 3 power features: **Templates** (save-as-template from prepared envelope, list, use → pre-filled draft envelope, delete), **Bulk Send** (single-signer templates → many recipients via "Name, email" rows with copyable sign links), **Reminders** (resend invites on sent/viewed envelopes from Envelope Detail), and **Envelope Expiration** (3/7/14/30-day options in Send Review, lazy expiry + background expiry loop, expiry shown on Envelope Detail). testing_agent_v3 results: Frontend 100%, Integration 100%, Backend 92.9% (only `.test` TLD email validation failures — expected). SendGrid remains in skip-mode (fallback sign links shown in UI).
**Goal:** production-ready sender accounts, templates, and reliability improvements.

**User stories (Phase 3)**
1. As a sender, I can sign up/log in with email/password and stay logged in via httpOnly cookies.
2. As a sender, I can log in with Google (“Continue with Google”) and my account links by email.
3. As a sender, I can save an envelope as a reusable template.
4. As a sender, I can reuse templates to send faster.
5. As a sender, I can resend invites and configure reminders/expiry.

**End of Phase 3: Testing**
- testing_agent_v3: Templates + bulk + remind + expiry verified E2E.

**Success criteria (Phase 3)**
- Auth-gated dashboard stable; Google callback race conditions avoided.
- Templates reliably reproduce field layouts.
- Reminder + expiry lifecycle consistent; audit log reflects sends/reminders/expiry.

---

### Phase 4 — White-label + Admin Dashboard + User Settings (Profile/Subscription/Help) ✅ COMPLETE — VERIFIED (iteration_3.json)
**Status:** DONE & TESTED. Frontend 100%, Integration 100%, Backend 95% (only `.test` TLD bulk-send email-validation failures — expected, unrelated to Phase 4). Delivered: (1) **White-label** — removed the "Made with Emergent" badge + emergent-main.js script from index.html, added a CSS safety net, and updated title/meta to CIVICSIGN. (2) **Admin Dashboard** (role-based, dark AdminShell at `/admin`) with Overview analytics (KPIs + 14-day charts + status/plan breakdowns), Users management (search, role/plan change, activate/deactivate with self-guard), Envelopes oversight (read-only, filter/search), and Contact inbox (mark handled/reopen). (3) **User Settings** (`/settings`) with Profile (edit name/email/mobile + change password, email uniqueness enforced), Subscription (mock Free/Pro/Business tiers), and Help & Support (FAQ + contact link). Backend: extended `users` (role/plan/mobile/active) with startup backfill + seeded internal admin `admin@civicsign.com`. Admin-only routes return 403 to non-admins and redirect in the UI.
**Theme:** Kept existing **bold & fresh** CIVICSIGN UI.

### Phase 5 — AI Help Chat + Account Deletion + Starter Templates + Deeper Analytics ✅ COMPLETE — VERIFIED (iteration_4 & iteration_5)
**Status:** DONE & TESTED. Backend 100% (16/16); Frontend 100% after fixing the multi-role Use dialog (iteration_5: 12/12). Delivered:
- **AI Help Chat** in Settings > Help & Support (logged-in only). NOTE: requested OpenAI/gpt-5, but the provisioned **Emergent universal key only permits Gemini models** (OpenAI not authorized), so the assistant runs on **Gemini (gemini-2.5-flash)** via the Emergent key. Swap MODEL_PROVIDER/MODEL_NAME in `assistant.py` once an OpenAI-enabled key is supplied.
- **Account deletion** (user side, Settings > Profile > Danger zone): typed-"DELETE" confirmation, cascade-deletes the user's envelopes/templates/GridFS documents, then logs out.
- **Change-password fields** no longer pre-filled (autoComplete=new-password).
- **Starter templates** shared library (owner_id="system", is_sample=true): NDA, IP Assignment Deed, Shareholders' Agreement, Offer Letter, Onboarding Letter \u2014 generated as PDFs with pre-placed signature/date/name fields via reportlab and seeded on startup. Any user can Use (multi-role) or Bulk-send (single-role) them.
- **Deeper admin analytics** in /api/admin/metrics: signing funnel (Sent\u2192Viewed\u2192Completed), avg time-to-sign, decline/expired rates, top active users \u2014 surfaced on the Admin Overview.
- **Admin CSV export** buttons (Users / Envelopes / Contacts) via /api/admin/export/*.csv.

### Phase 6 — Dedicated Admin Portal (separate login) ✅ COMPLETE — VERIFIED (live flow)
**Status:** DONE & TESTED (manual browser flow). Built a **separate, dark-branded admin portal** at `/admin/login` for internal team:
- Dedicated AdminLogin page (CIVICSIGN Admin / "Internal console — authorized team members only"), email+password only.
- Admin-only gate: a valid but non-admin account is logged out + shown "This portal is for internal team members only." Verified: admin → /admin; demo (non-admin) → stays on /admin/login.
- AdminProtected now redirects unauthenticated/non-admin users to `/admin/login`; AdminShell "Sign out" returns to `/admin/login`.
- Added an "Internal team? Admin sign in" link on the main user login page.
- Fixed recurring literal-unicode-escape issue (used real —, ·, …, • characters in JSX text/attributes across the new admin/settings files).

**User stories (Phase 4)**
1. As a product owner, I can remove all “Made with Emergent” branding/badges from CIVICSIGN.
2. As an internal team member, I can access a dedicated **Admin Dashboard** (role-based) to oversee the platform.
3. As a sender, I can manage my **profile** (name/email/mobile) from a Settings screen.
4. As a sender, I can view/manage my **subscription** (mock tiers: Free/Pro/Business).
5. As a sender, I can access a **Help Center** (FAQ + link to Contact).

**Scope decisions (confirmed)**
- **Admin access:** role field on user; seed `admin@civicsign.com`.
- **Admin dashboard includes:** platform analytics + user management + all envelopes oversight + contact inbox.
- **Subscription:** mock/placeholder tiers (no Stripe yet).
- **Help/Support:** Help Center page (FAQ + link to contact form).
- **Profile edits:** allow name, email, mobile number updates (email remains login identity).

**Implementation steps (Phase 4)**

#### 4.1 Remove Emergent badge / scripts (White-label)
- Remove `https://assets.emergent.sh/scripts/emergent-main.js` and the `<a id="emergent-badge">…</a>` badge from `/app/frontend/public/index.html`.
- Update meta/title/description in `index.html` to CIVICSIGN.
- Smoke test: ensure no runtime dependency on emergent-main.js.

#### 4.2 Data model upgrades
- Add fields to `users` collection:
  - `role`: `"user" | "admin"` (default `user`).
  - `mobile`: optional string.
  - `plan`: `"free" | "pro" | "business"` (default `free`).
  - `plan_status`: `"active" | "canceled" | "trial"` (mock).
  - `updated_at`.
- Seed internal admin user on startup:
  - `admin@civicsign.com` with role `admin` (keep existing demo user intact).
- Add indexes as needed: `users.role`, `contact_messages.created_at`.

#### 4.3 Backend: Admin APIs (FastAPI)
- Add `require_admin` dependency (checks `user.role == "admin"`).
- Admin endpoints (all authenticated + admin-only):
  - `GET /api/admin/metrics` (total users, envelopes by status, templates count, last-7-day series)
  - `GET /api/admin/users?query=&limit=&skip=` (search/list)
  - `PATCH /api/admin/users/{user_id}` (set role, deactivate/reactivate, update plan)
  - `GET /api/admin/envelopes?query=&status=&owner_id=` (oversight, read-only)
  - `GET /api/admin/contact-messages` (list)
  - `PATCH /api/admin/contact-messages/{contact_id}` (mark handled/unhandled)

#### 4.4 Frontend: Admin Dashboard (React)
- Add new app area:
  - Route group: `/admin/*` protected by admin role.
  - Admin shell/nav (separate from sender AppShell, or AppShell with conditional admin section).
- Screens:
  - **Admin Overview:** KPI cards + chart.
  - **Users:** search, view user details, set role, set plan, deactivate.
  - **Envelopes:** global table filter by status/owner.
  - **Contact Inbox:** list + mark handled.

#### 4.5 Frontend: User Settings area
- Add `/settings/*` routes (authenticated):
  - **Profile:** edit name, email, mobile; show auth provider; save.
  - **Subscription:** show current plan + mock upgrade buttons (Free/Pro/Business); store selection in user record.
  - **Help Center:** FAQ + link to `/contact`.
- Add nav entry for Settings (and maybe avatar dropdown with Settings/Logout).

#### 4.6 Backend: User Settings APIs
- `GET /api/users/me` (extended profile)
- `PATCH /api/users/me` (update name/email/mobile)
  - Validation and uniqueness check for email.
  - If email changes: mint fresh JWT so session reflects new email.
- `PATCH /api/users/me/subscription` (mock plan change)

#### 4.7 Testing (Phase 4)
- Backend unit/E2E tests:
  - Role checks: admin vs non-admin.
  - User profile update + email uniqueness.
  - Contact inbox CRUD.
- Frontend E2E (testing_agent_v3):
  - Admin login → /admin works, non-admin blocked.
  - Settings → profile update persists.
  - Subscription plan toggles.
  - Help center renders.
  - Confirm Emergent badge no longer appears.

**Success criteria (Phase 4)**
- No Emergent badge/scripts visible or loaded.
- Admin-only routes are inaccessible to non-admin users.
- Admin can view platform analytics, manage users, view all envelopes, and triage contact messages.
- Users can manage profile fields and mock subscription settings via Settings.

---

### Phase 5+ — Competitive Enhancements (Post Phase 4)
**User stories (Phase 5+)**
1. As a sender, I can add advanced fields (dropdowns, radio, validations).
2. As a sender, I can add team workspaces and roles (Org admin, member, viewer).
3. As a sender, I can configure automated reminder schedules (cron-like) per envelope.
4. As a platform, we can emit webhooks (envelope.sent/completed/declined/expired).
5. As an admin, I can view deeper analytics (time-to-sign, conversion funnel) and export data.

**Focus items**
- Advanced fields/validation.
- In-person signing mode.
- Stronger tamper-evidence: doc hash chaining + WORM-like audit storage.
- Optional webhooks + integrations (Zapier-style).

## 3) Next Actions
- Phase 4 execution order:
  1) Remove Emergent badge/scripts (white-label)
  2) Add role/mobile/plan fields + seed admin user
  3) Implement admin APIs + admin UI
  4) Implement user settings (profile/subscription/help)
  5) Run testing_agent_v3 and fix any issues

## 4) Success Criteria (overall)
- CIVICSIGN supports PDF + DOCX upload, accurate field placement, multi-recipient routing, no-account signing links, and produces a finalized signed PDF + certificate.
- Meets baseline ESIGN/eIDAS expectations: intent/consent capture, association, retention, tamper-evident audit trail.
- Sender experience is fast and polished; signer flow is frictionless; UI is bold/fresh and coherent.
- White-label ready; admin oversight and user settings make CIVICSIGN startup-ready.