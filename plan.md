# CIVICSIGN — Advanced Admin Capabilities (Frontend + Auth Fix) Plan (UPDATED — Completed)

## 1) Objectives
- Deliver **support-grade admin tooling** in a **separate Admin Portal** (`/admin/login`) including:
  - Per-user diagnostics (account status + email delivery context)
  - Admin-triggered password reset link generation (copyable in SendGrid skip-mode)
  - Secure “enter user account” **impersonation via OTP** (OTP shown on-screen in dev/skip-mode)
- Ensure impersonation works reliably by enforcing **auth token precedence**: **Bearer header overrides cookie**.
- Provide safe guardrails to prevent accidental privilege escalation:
  - **No role promotion to admin via portal UI**
  - **Backend enforcement** blocking `role` changes
- Add a public **Reset Password** page that consumes admin-generated reset tokens.
- Validate end-to-end flows via automated testing and manual verification.

**Current status:** All objectives **implemented and verified**.

---

## 2) Implementation Steps

### Phase 1 — Core Flow POC (must work before full UI)
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
- ✅ Implemented impersonation token usage via existing axios interceptor (`Authorization: Bearer <localStorage cs_token>`).
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
  - Plan/active management remains available from detail page.
- ✅ New page: `AdminUserDetail.jsx`
  - Fetches `GET /api/admin/users/{user_id}`.
  - Implements sections:
    - User summary (name/email/provider/active/plan/created)
    - Diagnostics block (email_configured, sender_email, email_note)
    - Controls: plan select, active toggle, read-only role badge
    - Password reset: `POST /api/admin/users/{id}/send-reset` with `base_url=window.location.origin` → displays copyable link
    - Impersonation:
      - Request OTP: `POST /api/admin/users/{id}/impersonate/request` → shows OTP on-screen in dev/skip-mode
      - Verify OTP: `POST /api/admin/users/{id}/impersonate/verify` → receives access token and starts impersonation
- ✅ `AuthContext.js`
  - Added impersonation state + helpers:
    - `startImpersonation(targetUser, token)`
    - `stopImpersonation()`
  - Persists admin token during impersonation (`cs_admin_token`) and stores metadata (`cs_impersonation`).
- ✅ `AppShell.jsx`
  - Added impersonation banner (shows target user) + **Exit** button.
  - **Important fix:** uses hard redirects (`window.location.href`) when entering/exiting impersonation to avoid the `AdminProtected` guard race (admin routes require admin user; impersonation turns user into non-admin).

**Reset Password (public page)**
- ✅ New page `ResetPassword.jsx`
  - Reads `token` query param.
  - Calls `GET /api/auth/reset-info?token=...` to show which email is being reset.
  - Posts `POST /api/auth/reset-password` with new password.
  - Shows success/invalid-token states.

**Routing**
- ✅ `App.js`
  - Added route `/admin/users/:userId` under AdminShell.
  - Added public route `/reset-password`.

**Notes / constraints**
- Emails remain **MOCKED / skip-mode** (SendGrid not configured):
  - Reset links are returned from API and shown in Admin UI.
  - Impersonation OTP is shown in Admin UI (dev-mode).
- Settings “change password” already uses `autoComplete="new-password"` to prevent current password prefill (completed previously).

---

### Phase 3 — Testing & Regression

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
  - Frontend: **92% (12/13)** with **no functional bugs** (minor page-state nuance only).
- ✅ Manual browser verification completed:
  - Impersonation enter → banner on `/dashboard` → exit → return to `/admin/users`.
  - Reset-password page renders valid/invalid token states.

---

## 3) Next Actions (Immediate)
All originally planned immediate actions are **complete**.

**Recommended next actions (future / out of scope for this iteration):**
1. Enable real email delivery:
   - Provide `SENDGRID_API_KEY` and `SENDER_EMAIL` and switch from skip-mode.
2. Stripe billing integration:
   - Replace illustrative plan switching with real subscriptions and webhooks.
3. Production hardening:
   - Move OTP delivery to email/SMS, add rate limiting, and add audit log UI.

---

## 4) Success Criteria
✅ Admin cannot change `role` from the portal (UI removed + backend blocks).

✅ Admin can:
- View per-user diagnostics.
- Generate a password reset link (copyable in skip-mode).
- Impersonate a user via OTP and operate as that user.
- Exit impersonation cleanly and return to the admin console.

✅ `/reset-password` works end-to-end:
- Token → show email → set password → login with new password.

✅ No regressions in:
- Login, envelopes, templates, exports, AI help assistant.

✅ `testing_agent_v3` run completed with passing results for critical flows (see iteration_6 report).
