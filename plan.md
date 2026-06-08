# CIVICSIGN — Advanced Admin Capabilities + Stripe Billing + Email Verification + **Resend Email Delivery** (UPDATED)

## 1) Objectives
- ✅ Deliver **support-grade admin tooling** in a **separate Admin Portal** (`/admin/login`) including:
  - Per-user diagnostics (account status + email delivery context)
  - Admin-triggered password reset link generation (copyable when needed)
  - Secure “enter user account” **impersonation via OTP** (support workflow)
- ✅ Ensure impersonation works reliably by enforcing **auth token precedence**: **Bearer header overrides cookie**.
- ✅ Provide guardrails to prevent privilege escalation:
  - **No role promotion to admin via portal UI**
  - **Backend enforcement** blocking `role` changes
- ✅ Add a public **Reset Password** page that consumes reset tokens.
- ✅ Replace mocked plan switching with **real Stripe Checkout billing** (test mode; one-time upgrade charges) with server-side prices + transaction ledger.
- ✅ Add **email verification on sign-up** using a **one-time 6-digit code** (verification required only once at signup), plus:
  - Block login until verified
  - Resend verification code
  - Welcome email after verification
  - Self-service forgot-password that issues reset links
- ✅ **Enable real email delivery** via **Resend** (replaces SendGrid skip-mode):
  - Verification codes, welcome email, password reset links, and signing invites are delivered via email
  - UI automatically hides dev-mode code/link boxes when email is live
- ✅ Validate end-to-end flows via automated testing and manual verification.

**Current status (as of iteration_7 + Resend enablement):**
- Admin capabilities: **Implemented + verified**.
- Stripe billing (one-time checkout per upgrade): **Implemented + verified**.
- Email registration & verification: **Implemented + verified**.
- **Resend email delivery: Implemented + verified (emails actually send)**.

---

## 2) Implementation Steps

### Phase 1 — Core Flow POC (Admin Impersonation)
**Core workflow:** Admin impersonation via OTP + header-first token precedence.

**User stories (POC)**
1. As an admin, I can request an OTP to impersonate a user.
2. As an admin, I can verify the OTP and receive an impersonation access token.
3. As an admin, I can use the impersonation token to act as the user even if my admin cookie is present.
4. As an admin, I can exit impersonation and return to my admin session.
5. As a support engineer, I can reproduce a user issue inside their account without knowing their password.

**Backend (precedence fix)**
- ✅ Updated `/app/backend/auth.py:get_current_user` to check **Authorization: Bearer** first, then fall back to cookies.
- ✅ Regression validated: normal cookie-based sessions continue to work.

**Frontend POC (minimal wiring)**
- ✅ Uses axios interceptor (`Authorization: Bearer <localStorage cs_token>`).
- ✅ Confirmed impersonation token overrides admin cookie due to backend precedence.

**POC verification**
- ✅ Verified via manual `curl` and browser.

---

### Phase 2 — V1 App Development (Admin UX + Reset Password)

**User stories (V1)**
1. As an admin, I can open a user row and view a detail page with diagnostics and recent activity.
2. As an admin, I can deactivate/reactivate a user and change their plan.
3. As an admin, I can generate a password reset link and share it.
4. As an admin, I can impersonate a user via OTP from the user detail page and clearly see I’m impersonating.
5. As a user, I can open a reset-password link, set a new password, and sign in.

**Admin Portal UX**
- ✅ `AdminUsers.jsx`
  - Removed role dropdown (rendered **read-only Role badge**).
  - Rows navigate to `/admin/users/:userId` (User Detail).
- ✅ New page: `AdminUserDetail.jsx`
  - Fetches `GET /api/admin/users/{user_id}`.
  - Implements:
    - User summary (name/email/provider/active/plan/created)
    - Diagnostics block (email_configured, sender_email, email_note)
    - Controls: plan select, active toggle, read-only role badge
    - Password reset: `POST /api/admin/users/{id}/send-reset` → displays copyable link
    - Impersonation OTP request/verify
- ✅ `AuthContext.js`
  - Added impersonation state + helpers.
  - Preserves admin token during impersonation (`cs_admin_token`) and stores metadata (`cs_impersonation`).
- ✅ `AppShell.jsx`
  - Added impersonation banner + Exit.
  - Uses hard redirects (`window.location.href`) entering/exiting impersonation to avoid admin route-guard race.

**Reset Password (public page)**
- ✅ New page `ResetPassword.jsx`
  - Uses `GET /api/auth/reset-info?token=...` and `POST /api/auth/reset-password`.

**Routing**
- ✅ `App.js`
  - Added `/admin/users/:userId` under AdminShell.
  - Added public `/reset-password`.

**Notes / constraints (updated)**
- ✅ Email delivery is now **LIVE via Resend**, but admin reset links are still returned in the UI for support convenience.

---

### Phase 3 — Testing & Regression (Admin Features)

**User stories (testing)**
1. As an admin, I cannot promote any user to admin from the portal.
2. As an admin, I can impersonate a user and still load all normal app pages.
3. As a user, I can reset password using the admin-provided link.
4. As a normal user, I never see admin-only UI/routes.
5. As a system owner, exports/analytics and signing flows still work after changes.

**Testing steps**
- ✅ Backend smoke testing via `curl` completed.
- ✅ Automated end-to-end testing via `testing_agent_v3` completed:
  - Report: `/app/test_reports/iteration_6.json`
  - Backend: **100% (36/36)**
  - Frontend: **92% (12/13)** with **no functional bugs**
- ✅ Manual browser verification completed.

---

### Phase 4 — Stripe Billing Integration (Test keys + One-time Upgrade Charges)

**Goal:** Replace mocked plan switching with real Stripe Checkout payments.

**Billing model chosen (by user)**
- ✅ Use **test keys** during development (1a)
- ✅ Use **one-time charge per upgrade** (2a) (not auto-renewing subscriptions)

**Status:** ✅ Implemented + verified (iteration_7)

**User stories (Billing V1)**
1. As a logged-in user, I can upgrade from Free → Pro or Free → Business using Stripe Checkout.
2. As a logged-in user, I can upgrade from Pro → Business using Stripe Checkout.
3. As a logged-in user, after successful payment, my plan updates in CIVICSIGN (idempotently).
4. As a logged-in user, if I cancel payment, I return to Settings with no plan change.
5. As a system owner, I can audit payments in `payment_transactions`.

#### Backend Implementation
**Environment / credentials**
- ✅ Added to `/app/backend/.env`:
  - `STRIPE_API_KEY=sk_test_emergent` (Emergent sandbox default; user can later swap to their own test/live key)

**Server-side plan pricing (security-critical)**
- ✅ Fixed, backend-only plan mapping:
  - `pro = 15.00 USD`
  - `business = 49.00 USD`
  - `free = 0` (no checkout)
- ✅ Backend never accepts amount/currency from frontend.

**DB collection**
- ✅ `payment_transactions` ledger
  - Tracks: `tx_id`, `user_id`, `email`, `plan_id`, `amount`, `currency`, `session_id`, `status`, `payment_status`, `processed`, timestamps.

**Router: `/app/backend/billing.py`**
- ✅ `POST /api/billing/checkout` (auth)
- ✅ `GET /api/billing/status/{session_id}` (auth)
- ✅ `POST /api/webhook/stripe`

#### Frontend Implementation
**Settings → Subscription tab** (`/app/frontend/src/pages/Settings.jsx`)
- ✅ Free plan downgrade uses existing `/auth/subscription`.
- ✅ Paid upgrades redirect to Stripe Checkout.
- ✅ On return with `session_id`, frontend polls status, refreshes session, and cleans URL.

#### Testing (Billing)
- ✅ Manual curl smoke tests.
- ✅ Automated testing via `testing_agent_v3`:
  - Report: `/app/test_reports/iteration_7.json`

---

### Phase 5 — Email Registration & Verification (One-time OTP at Signup + Reset Password Emails)

**Goal:** Require one-time email verification at signup; after that login is email+password only. Send welcome email after verification. Provide self-service forgot-password.

**Status:** ✅ Implemented + verified (iteration_7)

**Backend**
- ✅ `/api/auth/register` returns `verification_required` and issues no session until verified.
- ✅ `/api/auth/verify-email` marks verified, sends welcome email, issues session.
- ✅ `/api/auth/resend-verification` resends code.
- ✅ `/api/auth/login` blocks unverified.
- ✅ `/api/auth/forgot-password` emails reset link (and returns dev_link only if email not configured).

**Frontend**
- ✅ `/verify-email` page and route.
- ✅ Register redirects to verify.
- ✅ Login auto-resends and routes to verify when blocked.
- ✅ Login includes Forgot Password dialog.

**Testing**
- ✅ Automated + manual verification via `testing_agent_v3`:
  - Report: `/app/test_reports/iteration_7.json`

---

### Phase 6 — **Resend Email Delivery (Production Email Enablement)**

**Goal:** Replace SendGrid skip-mode with real email sending via Resend.

**Status:** ✅ Implemented + verified (emails send successfully)

**Implementation**
- ✅ Installed `resend==2.30.1` and updated `/app/backend/requirements.txt`.
- ✅ Updated `/app/backend/.env`:
  - `RESEND_API_KEY` configured
  - `SENDER_EMAIL=no-reply@civicsign.co.uk`
  - `SENDER_NAME=CIVICSIGN`
- ✅ Rewrote `/app/backend/email_service.py`:
  - Uses `resend.Emails.send` with HTML support
  - Uses `CIVICSIGN <no-reply@civicsign.co.uk>` From address
  - `is_configured()` now returns true when Resend env vars are present
  - Attachments supported for completion emails

**Verified behaviors**
- ✅ Resend sends return `sent` + id (confirmed via `delivered@resend.dev`).
- ✅ Signup now emails verification code; no on-screen `dev_code` when configured.
- ✅ Forgot-password emails reset link; no `dev_link` surfaced when configured.
- ✅ Welcome email triggers after verification.
- ✅ Signing invites are emailed; UI still returns shareable links (no disruption).
- ✅ Admin support actions remain unchanged:
  - Admin reset link is still returned in Admin UI
  - Impersonation OTP remains returned to admin (support tool)

---

## 3) Next Actions (Immediate)
1. **Resend deliverability hardening**
   - Confirm Resend domain `civicsign.co.uk` is fully verified (SPF/DKIM/DMARC) and monitor bounces/spam placement.
   - Add optional bounce/complaint tracking if needed.
2. **Stripe go-live checklist**
   - Rotate any exposed `sk_live_*` keys immediately.
   - Swap `.env` to your own `sk_test_*` and later `sk_live_*` when ready.
3. **Optional security improvements**
   - Rate limiting for verification code resends and login attempts.
   - Add an audit log UI for admin actions (impersonation, resets, deactivations).
   - Optional: change impersonation OTP to email-to-user for consent once support workflow is finalized.
4. **Optional billing upgrade**
   - Move from one-time charges to true subscriptions (recurring billing + customer portal) if required.

---

## 4) Success Criteria

### Admin/Support (achieved)
✅ Admin cannot change `role` from the portal (UI removed + backend blocks).

✅ Admin can:
- View per-user diagnostics.
- Generate a password reset link.
- Impersonate a user via OTP and operate as that user.
- Exit impersonation cleanly and return to the admin console.

✅ `/reset-password` works end-to-end.

### Stripe Billing (achieved)
✅ Upgrade to Pro/Business triggers Stripe Checkout and charges the correct backend-defined amount.
✅ Successful payment upgrades `users.plan` exactly once (idempotent).
✅ Cancel/expired does not change plan.
✅ `payment_transactions` records every attempt with status and processed guard.
✅ Frontend polls on return and refreshes user state.

### Email Verification + Welcome + Forgot Password (achieved)
✅ Signup requires a one-time 6-digit verification code before login.
✅ Verified users log in normally (email+password) thereafter.
✅ Welcome email is triggered after verification.
✅ Forgot-password emails reset links.

### Email Delivery (Resend) (achieved)
✅ Transactional emails actually send via Resend:
- verification codes
- welcome email
- password reset
- signing invites
- completion emails (with attachments)

### No regressions
✅ Dashboard, envelopes, templates, settings, signing flows and admin portal continue to work.

---

## Reference Test Reports
- Admin + impersonation + reset: `/app/test_reports/iteration_6.json`
- Email verification + Stripe billing: `/app/test_reports/iteration_7.json`
