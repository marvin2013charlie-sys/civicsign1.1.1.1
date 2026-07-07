# CivicSign — Launch Roadmap & Checklist

**Generated:** July 2026  
**Project:** `civicsign1.3-2026-07-04 2 copy`  
**Stack:** React 19 (CRA) + FastAPI + MongoDB + Stripe + Resend

---

## Executive summary

| Launch tier | Completeness | Timeline (estimate) |
|-------------|--------------|---------------------|
| **Private beta** (founder-led, manual ops) | **~82%** | 2–4 weeks |
| **Public SaaS launch** (self-serve, monitored) | **~65%** | 6–8 weeks |
| **Enterprise-ready** (recurring billing, SSO, compliance) | **~50%** | 3–6 months |

**Bottom line:** The product is **substantially built**. Core signing, admin, organisations, seals, and billing (one-time) work end-to-end. What remains is mostly **deployment, billing truth, polish, tests, and closing marketing vs reality gaps**.

---

## What is built (done)

Use this as your “inventory” — do not rebuild these.

### Core product
- [x] Upload PDF / Word (.docx) → prepare fields → send → sign → completed PDF
- [x] Signer flow (no account): consent, guided fields, draw/type/upload signature
- [x] Envelope lifecycle: draft, sent, viewed, completed, declined, voided, expired
- [x] Reminders (manual + automated expiry loop)
- [x] Audit trail + Certificate of Completion + SHA-256 seal
- [x] Seal verify: per-row, bulk, upload-to-find (fixed)
- [x] Templates, sample library, bulk send (CSV)
- [x] PowerForms (public `/form/:slug`)
- [x] PDF Manager (edit, merge, split, whiteout)
- [x] Comments on envelopes (SSE)
- [x] Dashboard, Documents, Reports, Usage, Contacts

### Auth & accounts
- [x] Register, email verification (6-digit), login, refresh tokens
- [x] Forgot/reset password, profile, avatar, account deletion
- [x] Rate limiting on auth endpoints
- [x] HttpOnly cookies + Bearer (dual mode)

### Billing (partial)
- [x] Free / Pro / Business plan gating
- [x] Stripe Checkout — Pro upgrade (one-time payment)
- [x] Extra document credits (£1)
- [x] Stripe webhooks + plan HMAC anti-tamper
- [x] Admin billing dashboard + refunds
- [x] Free downgrade via API

### Enterprise / organisations
- [x] Admin: create orgs, contract upload, member limits
- [x] Org portal: overview, team, contract view/download
- [x] Per-seat quotas, shared org pool
- [x] Org owner: add members, quotas, pause, reset passwords

### Admin console
- [x] Users, diagnostics, plan changes, impersonation (OTP)
- [x] Billing & refunds, audit log, contact inbox
- [x] Blog CMS, careers CMS, internal team (staff permissions)
- [x] Organisations management

### Security
- [x] AES-256-GCM document encryption at rest
- [x] Impersonation blocked from PDF download
- [x] Webhook SSRF protection, signer rate limits
- [x] CSP + security headers
- [x] MongoDB schema validators on startup

### Marketing & legal site
- [x] Landing, About, Contact, 9 solution pages
- [x] Blog, Resources, Careers (public + CMS)
- [x] Privacy, Terms, Cookies, Refund policies
- [x] SEO (sitemap, meta, robots.txt)
- [x] Cookie banner (landing)

### Integrations (v1)
- [x] API keys + outbound webhooks (HMAC)
- [x] `GET /api/v1/envelopes` (list only)

### AI (optional — needs `OPENAI_API_KEY`)
- [x] Draft message (`SendReview`)
- [x] Help assistant
- [x] Backend: summary + suggest-fields (no UI yet)

---

## What still needs work

### P0 — Must fix before any public launch

| # | Item | Why it matters | Where |
|---|------|----------------|-------|
| 1 | **Production deployment** | No Docker, nginx, or CI in repo | New: `deploy/` or docs |
| 2 | **`DOCUMENT_ENCRYPTION_KEY` in prod** | Docs encrypted only with this set | `document_crypto.py`, `.env.example` |
| 3 | **Rotate all secrets** | `.env` may exist in shared copies | Atlas, Stripe, JWT, Resend |
| 4 | **Stripe live mode + webhook URL** | Payments must work in production | Stripe dashboard + `billing.py` |
| 5 | **Resend domain verification** | SPF/DKIM/DMARC for `civicsign.co.uk` | Resend dashboard |
| 6 | **LibreOffice on API server** | Word → PDF conversion | Server install (`soffice`) |
| 7 | **Billing copy vs reality** | Terms say “subscriptions”; code is **one-time payment** with no expiry | `billing.py`, `Terms.jsx`, `RefundPolicy.jsx` |
| 8 | **SMS auth: wire or hide** | Business plan markets SMS; code logs OTP in dev only | `server.py` signer auth, `Landing.jsx` |
| 9 | **Google sign-in: wire or remove** | Privacy policy mentions Google; no OAuth UI | `Login.jsx`, `PrivacyPolicy.jsx` |
| 10 | **Email change UX broken** | Settings allows email edit; API rejects it | `Settings.jsx`, `auth.py` |

### P1 — Should fix before public SaaS launch

| # | Item | Where |
|---|------|-------|
| 11 | **Stripe recurring subscriptions** OR document “lifetime Pro until renewal built” | `billing.py` |
| 12 | **Wire `AdminEnvelopes` page** (exists, unreachable) | `App.js`, `AdminShell.jsx` |
| 13 | **E2E smoke test** (register → send → sign → download → verify seal) | New: `e2e/` + Playwright |
| 14 | **CI pipeline** (build + pytest + lint) | `.github/workflows/` |
| 15 | **Error monitoring** (Sentry or similar) | Frontend + backend |
| 16 | **Health check + uptime monitoring** | `/health` + external ping |
| 17 | **Update `.env.example`** with all production vars | `backend/.env.example` |
| 18 | **Business “unlimited” vs 10k fair-use** — align marketing | `Landing.jsx`, `plan_features.py` |
| 19 | **QES: remove from marketing or partner integrate** | `Landing.jsx`, `signature_levels.py` |
| 20 | **Cookie/analytics consent** — PostHog opt-in if used | `index.html`, cookie banner |

### P2 — Nice to have / post-launch

| # | Item |
|---|------|
| 21 | Teams UI (`/api/teams` backend exists, no frontend) |
| 22 | AI summary + suggest-fields in Prepare Studio |
| 23 | Email change flow UI (`request-email-change` / `confirm-email-change`) |
| 24 | v1 API: create/send envelopes programmatically |
| 25 | Stripe Customer Portal |
| 26 | Org SSO / SAML |
| 27 | Contract version history |
| 28 | Remove JWT from login JSON body (security hardening) |
| 29 | Migrate legacy unencrypted GridFS documents |
| 30 | SOC 2 / formal compliance roadmap |

---

## Test coverage today

| Area | Status |
|------|--------|
| Backend integration | `backend/tests/test_avatar_and_features.py` (~15 tests, needs live API) |
| Frontend unit | 3 files (`formatApiError`, `clipboard`, `Logo`) |
| E2E | None |
| CI | None |

**Untested (high risk):** full signing flow, Stripe webhooks, org portal, seal verify, bulk send, PowerForms, PDF manager, admin impersonation.

---

## Environment checklist (production)

```bash
# Required
MONGO_URL=mongodb+srv://...
DB_NAME=civicsign
JWT_SECRET=<64+ char random hex>
PLAN_ENCRYPTION_SECRET=<random hex>
DOCUMENT_ENCRYPTION_KEY=<base64 32-byte key>
CORS_ORIGINS=https://www.civicsign.co.uk
COOKIE_SECURE=true
TRUST_PROXY=true
DEV_MODE=false

# Email
RESEND_API_KEY=re_...
SENDER_EMAIL=no-reply@civicsign.co.uk
SENDER_NAME=CivicSign
FRONTEND_URL=https://www.civicsign.co.uk

# Billing
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
OPENAI_API_KEY=sk-...
ORG_SEAT_MONTHLY_LIMIT=500
BUSINESS_FAIR_USE_MONTHLY=10000
```

**Frontend build:**
```bash
REACT_APP_BACKEND_URL=   # empty = same-origin /api proxy
REACT_APP_SITE_URL=https://www.civicsign.co.uk
```

---

# Step-by-step launch roadmap

Work phases in order. Check boxes as you complete each item.

---

## Phase 0 — Freeze & inventory (1–2 days)

- [ ] **0.1** Tag current codebase as `pre-launch-baseline` (git tag)
- [ ] **0.2** Confirm test accounts in `DEV_TEST_LOGINS.txt` still work locally
- [ ] **0.3** Run full manual smoke test (see Phase 4 checklist)
- [ ] **0.4** List all secrets that must be rotated for production
- [ ] **0.5** Decide launch tier: **private beta** vs **public SaaS** (sets scope)

---

## Phase 1 — Truth in marketing & UX (3–5 days)

Fix things that will embarrass you on day one.

- [ ] **1.1** **Billing honesty**
  - [ ] Choose: (A) implement Stripe subscriptions, or (B) update Terms/Refund/Landing to say one-time Pro purchase
  - [ ] If (B): remove “monthly subscription renews” language until subscriptions ship
- [ ] **1.2** **SMS recipient auth**
  - [ ] Option A: integrate Twilio (or similar) in `signer_send_auth_code`
  - [ ] Option B: remove SMS from Business plan marketing until wired
- [ ] **1.3** **Google sign-in**
  - [ ] Option A: add OAuth routes + Login/Register buttons
  - [ ] Option B: remove Google references from Privacy/Cookies
- [ ] **1.4** **QES / unlimited claims**
  - [ ] Soften Landing Business bullets: fair-use 10k, no QES until partner
- [ ] **1.5** **Email change**
  - [ ] Either wire `request-email-change` flow in Settings, or make email read-only in UI
- [ ] **1.6** **Privacy policy**
  - [ ] Add encryption-at-rest mention (matches `document_crypto.py`)

---

## Phase 2 — Production infrastructure (1–2 weeks)

- [ ] **2.1** **MongoDB Atlas**
  - [ ] Create production cluster (UK region if claiming UK-hosted)
  - [ ] Run `migrate_to_atlas.py` if migrating from local
  - [ ] Enable backups, IP allowlist, strong DB user
- [ ] **2.2** **API server**
  - [ ] Provision VPS or container host (e.g. Railway, Fly, AWS, Hetzner)
  - [ ] Install Python 3.12, LibreOffice (`soffice`), system deps from `requirements.txt`
  - [ ] Set all env vars from checklist above
  - [ ] Run: `uvicorn server:app --host 0.0.0.0 --port 8001` (or behind gunicorn)
- [ ] **2.3** **Frontend hosting**
  - [ ] `npm run build` in `frontend/`
  - [ ] Deploy `frontend/build/` to CDN or static host (Vercel, Netlify, S3+CloudFront)
  - [ ] OR serve static + proxy `/api` via nginx on same domain
- [ ] **2.4** **Reverse proxy (nginx recommended)**
  - [ ] TLS certificate (Let’s Encrypt)
  - [ ] `/api` → backend :8001
  - [ ] `/` → static frontend
  - [ ] SSE: `proxy_buffering off` for comment streams
  - [ ] Set `TRUST_PROXY=true` on backend
- [ ] **2.5** **Stripe live**
  - [ ] Switch to `sk_live_*` keys
  - [ ] Register webhook: `https://yourdomain.com/api/webhook/stripe`
  - [ ] Test Pro upgrade end-to-end on live (small amount, refund)
- [ ] **2.6** **Resend**
  - [ ] Verify sending domain
  - [ ] Send test: verify email, invite, completion PDF
- [ ] **2.7** **Document encryption**
  - [ ] Generate and set `DOCUMENT_ENCRYPTION_KEY`
  - [ ] Verify new uploads encrypt; plan legacy doc migration (P2)
- [ ] **2.8** **Health & monitoring**
  - [ ] Confirm `GET /health` (or ping) responds
  - [ ] Add UptimeRobot / Better Stack ping every 5 min
  - [ ] Add Sentry DSN (frontend + backend) — optional but recommended

---

## Phase 3 — Product polish (1 week)

- [ ] **3.1** Wire **Admin Envelopes** page
  - [ ] Add route in `frontend/src/App.js`
  - [ ] Add nav item in `AdminShell.jsx`
- [ ] **3.2** Update `backend/.env.example` with all vars from env checklist
- [ ] **3.3** Add `Makefile` targets: `install`, `lint`, `test-all`
- [ ] **3.4** Optional: Docker Compose for local prod-like stack (document in README)
- [ ] **3.5** Review org portal + seal verify on staging (already fixed in dev)
- [ ] **3.6** Disable `DEV_MODE` on production; confirm OTPs not leaked in API responses

---

## Phase 4 — Quality gate (1 week)

### Manual smoke test (run on staging before launch)

- [ ] **4.1** Register new user → verify email → login
- [ ] **4.2** Upload PDF → place fields → add recipient → send
- [ ] **4.3** Open signer link → sign → complete
- [ ] **4.4** Download completed PDF from sender account
- [ ] **4.5** Documents → Sealed & verify → upload PDF → match + verify
- [ ] **4.6** Upgrade to Pro via Stripe (live or test mode on staging)
- [ ] **4.7** Admin login → create org → upload contract → org owner sees contract
- [ ] **4.8** Org owner → add team member → member can login and send doc
- [ ] **4.9** Void envelope, reminder, template reuse
- [ ] **4.10** PowerForm public link sign
- [ ] **4.11** Contact form submission → admin inbox
- [ ] **4.12** Password reset flow

### Automated tests (minimum)

- [ ] **4.13** Add Playwright E2E: register → send → sign (happy path)
- [ ] **4.14** GitHub Actions: `npm run build` + `pytest` on push
- [ ] **4.15** Fix or suppress CI lint warnings in `PdfTextEditor.jsx`, `usePageSeo.js`

---

## Phase 5 — Private beta launch (week 4)

- [ ] **5.1** Deploy Phase 2 infrastructure to production URLs
- [ ] **5.2** Point domain DNS (`civicsign.co.uk` / `www`)
- [ ] **5.3** Invite 5–10 pilot users (1 org + individuals)
- [ ] **5.4** Monitor: errors, email delivery, Stripe, MongoDB connections
- [ ] **5.5** Collect feedback doc; triage P0 bugs only
- [ ] **5.6** Prepare support channel (email `info@civicbot.co.uk` or similar)

---

## Phase 6 — Public SaaS launch (weeks 5–8)

- [ ] **6.1** Implement **Stripe subscriptions** OR publish clear one-time pricing FAQ
- [ ] **6.2** Business plan: sales page + manual onboarding OR enable checkout
- [ ] **6.3** Twilio SMS for Business recipient auth (if still marketed)
- [ ] **6.4** Expand E2E tests (billing, org portal, admin)
- [ ] **6.5** Load test: 50 concurrent signers on one envelope
- [ ] **6.6** Bounce handling for Resend (webhook)
- [ ] **6.7** Public status page (optional)
- [ ] **6.8** Launch announcement: blog post, update Landing metrics honestly

---

## Phase 7 — Enterprise & scale (months 2–6)

- [ ] **7.1** Teams UI for Pro template sharing
- [ ] **7.2** v1 API: create + send envelopes
- [ ] **7.3** Org audit log (per-org view)
- [ ] **7.4** QES via QTSP partner (if required by customers)
- [ ] **7.5** SAML SSO for organisations
- [ ] **7.6** Separate worker process for `expiry_loop` (multi-instance API)
- [ ] **7.7** SOC 2 Type I planning
- [ ] **7.8** Remove JWT from login response body

---

## Quick reference — file map

| Area | Key paths |
|------|-----------|
| Frontend routes | `frontend/src/App.js` |
| Admin nav | `frontend/src/components/AdminShell.jsx` |
| API entry | `backend/server.py` |
| Billing | `backend/billing.py`, `frontend/src/pages/Settings.jsx` |
| Organisations | `backend/organizations.py`, `frontend/src/pages/OrganisationPortal.jsx` |
| Seal verify | `backend/server.py` (lookup), `frontend/src/components/DocumentsSealedPanel.jsx` |
| Security notes | `SECURITY-NOTES.md` |
| Test logins | `DEV_TEST_LOGINS.txt` |
| Local dev | `README.md`, `Makefile` |

---

## Suggested next action (today)

1. Complete **Phase 0** smoke test locally.
2. Pick **Phase 1.1** billing decision (subscriptions vs one-time + honest copy).
3. Start **Phase 2.1** Atlas + **2.2** API server provisioning in parallel.

---

*This roadmap reflects a full codebase scan. Re-run after major feature work to refresh completion %.*