# CIVICSIGN — Advanced Admin Capabilities + Stripe Billing Integration Plan (UPDATED)

## 1) Objectives
- ✅ Deliver **support-grade admin tooling** in a **separate Admin Portal** (`/admin/login`) including:
  - Per-user diagnostics (account status + email delivery context)
  - Admin-triggered password reset link generation (copyable in SendGrid skip-mode)
  - Secure “enter user account” **impersonation via OTP** (OTP shown on-screen in dev/skip-mode)
- ✅ Ensure impersonation works reliably by enforcing **auth token precedence**: **Bearer header overrides cookie**.
- ✅ Provide safe guardrails to prevent accidental privilege escalation:
  - **No role promotion to admin via portal UI**
  - **Backend enforcement** blocking `role` changes
- ✅ Add a public **Reset Password** page that consumes admin-generated reset tokens.
- ✅ Validate end-to-end flows via automated testing and manual verification.
- ⏳ **NEW (Current Focus): Replace mocked subscription switching with real Stripe billing** using:
  - **Test keys (1a)**
  - **One-time charge per upgrade (2a)** via Emergent Stripe Checkout wrapper
  - Server-side price enforcement (no frontend price trust)
  - A transaction ledger (`payment_transactions`) + idempotent plan upgrades

**Current status:**
- Admin capabilities: **Implemented and verified**.
- Stripe billing: **Planned (not implemented yet)**.

---

## 2) Implementation Steps

### Phase 1 — Core Flow POC (Admin Impersonation)
**Core workflow:** Admin impersonation via OTP + header-first token precedence.

**User stories (POC)**
1. As an admin, I can request an OTP to impersonate a user and see it on-screen (dev mode).
2. As an admin, I can verify the OTP and receive an impersonation access token.
3. As an admin, I can use the impersonation token to act as the user even if my admin cookie is present.
4. As an admin, I can exit impersonation and return to my admin session.
5. As a support engineer, I can reproduce a user issue inside their account without knowing their password.

**Backend (precedence fix)**
- ✅ Updated `/app/backend/auth.py:get_current_user` to check **Authorization: Bearer** first, then fall back to cookies.
- ✅ Regression validated: normal cookie-based sessions continue to work.

**Frontend POC (minimal wiring)**
- ✅ Implemented impersonation token usage via axios interceptor (`Authorization: Bearer <localStorage cs_token>`).
- ✅ Confirmed impersonation token overrides admin cookie due to backend precedence.

**POC verification**
- ✅ Verified via manual `curl` and browser:
  - request OTP → verify OTP → token minted → `/api/auth/me` returns impersonated user.

---

### Phase 2 — V1 App Development (Admin UX + Reset Password)

**User stories (V1)**
1. As an admin, I can open a user row and view a detail page with diagnostics and recent activity.
2. As an admin, I can deactivate/reactivate a user and change their plan.
3. As an admin, I can generate a password reset link and copy it to share with the user.
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

**Notes / constraints**
- Emails remain **MOCKED / skip-mode** (SendGrid not configured):
  - Reset links are returned from API and shown in Admin UI.
  - Impersonation OTP is shown in Admin UI (dev-mode).

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

### Phase 4 — NEW: Stripe Billing Integration (Test keys + One-time Upgrade Charges)

**Goal:** Replace mocked plan switching with real Stripe Checkout payments.

**Billing model chosen (by user):**
- ✅ Use **test keys** during development (1a)
- ✅ Use **one-time charge per upgrade** (2a) (not auto-renewing subscriptions)

**User stories (Billing V1)**
1. As a logged-in user, I can upgrade from Free → Pro or Free → Business using Stripe Checkout.
2. As a logged-in user, I can upgrade from Pro → Business using Stripe Checkout.
3. As a logged-in user, after successful payment, my plan updates in CIVICSIGN.
4. As a logged-in user, if I cancel payment, I return to Settings with no plan change.
5. As a system owner, I can audit payments in `payment_transactions`.

#### Backend Implementation
**Environment / credentials**
- Add to `/app/backend/.env`:
  - `STRIPE_API_KEY=sk_test_emergent` (Emergent sandbox default; user can later swap to their own test key)
- Ensure `load_dotenv` is in place (already in `server.py`).

**Server-side plan pricing (security-critical)**
- Define fixed, backend-only plan mapping:
  - `pro = 15.00 USD`
  - `business = 49.00 USD`
  - `free = 0` (no checkout)
- Never accept amount/currency from frontend.

**Create mandatory DB collection**
- `payment_transactions` (required by playbook)
  - Example fields:
    - `tx_id`, `user_id`, `email`, `plan_id`, `amount`, `currency`, `session_id`
    - `status` (initiated|paid|failed|expired)
    - `processed` (bool, for idempotent plan upgrade)
    - `metadata`, `created_at`, `updated_at`

**New router: `/app/backend/billing.py`**
- `POST /api/billing/checkout` (auth required)
  - Input: `{ plan_id, origin_url }`
  - Backend builds success/cancel URLs using `origin_url`:
    - success: `${origin_url}/settings?tab=subscription&session_id={CHECKOUT_SESSION_ID}`
    - cancel: `${origin_url}/settings?tab=subscription`
  - Uses `StripeCheckout.create_checkout_session()` (emergentintegrations)
  - Writes `payment_transactions` record with status `initiated`.
  - Returns `{ url, session_id }`.

- `GET /api/billing/status/{session_id}` (auth required)
  - Calls `StripeCheckout.get_checkout_status(session_id)`.
  - Updates transaction record status.
  - If `payment_status == 'paid'` and `processed == false`:
    - Updates `users.plan` to purchased plan
    - Sets `processed=true` (idempotency)

- `POST /api/webhook/stripe`
  - Uses `StripeCheckout.handle_webhook()`.
  - Updates `payment_transactions`.
  - If paid and not processed: upgrade user plan (idempotent).

**Server wiring**
- Add router include in `server.py`.

#### Frontend Implementation
**Settings → Subscription tab** (`/app/frontend/src/pages/Settings.jsx`)
- Replace mocked paid plan selection for Pro/Business:
  - For `free`: keep existing `/auth/subscription` to downgrade (no payment)
  - For `pro`/`business` upgrades:
    1. call `POST /api/billing/checkout` with `{ plan_id, origin_url: window.location.origin }`
    2. redirect to Stripe via returned `url`

**Return from Stripe (polling required)**
- On Settings Subscription tab load:
  - If query `session_id` exists:
    - Poll `GET /api/billing/status/{session_id}` (max attempts, small delay)
    - On paid:
      - call `checkAuth()` to refresh user
      - toast success
      - remove `session_id` from URL (clean history)
    - On expired/canceled:
      - toast message; clean URL

#### Testing (Billing)
- Backend manual curl tests:
  - checkout session creation returns URL and inserts `payment_transactions`.
  - status endpoint updates transaction.
- E2E: run `testing_agent_v3` for:
  - upgrade flow redirect + return polling
  - cancel flow
  - idempotency (refresh success page doesn’t double-upgrade)

---

## 3) Next Actions (Immediate)
1. Implement Phase 4 backend (`billing.py`, `payment_transactions`, webhook endpoint, server wiring).
2. Update Settings Subscription tab frontend to use real checkout + status polling.
3. Run manual curl smoke tests.
4. Run `testing_agent_v3` end-to-end billing test suite.

---

## 4) Success Criteria
### Admin/Support (already achieved)
✅ Admin cannot change `role` from the portal (UI removed + backend blocks).

✅ Admin can:
- View per-user diagnostics.
- Generate a password reset link (copyable in skip-mode).
- Impersonate a user via OTP and operate as that user.
- Exit impersonation cleanly and return to the admin console.

✅ `/reset-password` works end-to-end.

### Stripe Billing (new)
- ✅ Upgrade to Pro/Business triggers Stripe Checkout and charges the correct backend-defined amount.
- ✅ Successful payment upgrades `users.plan` exactly once (idempotent).
- ✅ Cancel/expired does not change plan.
- ✅ `payment_transactions` records every attempt with status history.
- ✅ Frontend uses polling on return to confirm payment status and refreshes user state.
- ✅ No regressions in envelopes/templates/signing/admin portal.
