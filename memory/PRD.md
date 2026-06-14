# CIVICSIGN — Product Requirements

## Original problem statement
Replicate the user's private GitHub repo `civicsign` as a UK GDPR-compliant e-signature SaaS, then iteratively extend it with:
- Super-admin panel (metrics, billing, refunds, audit log)
- UK ownership / GDPR-approved positioning across the marketing site
- 500 documents per user/month quota for Pro plan
- Solutions pages for Real Estate and Staffing Agency
- Zoho-Sign-style sidebar with Documents / Reports / Usage nav items
- Cinematic "Security & Trust" walkthrough page with AI voiceover (still pending)

## Tech stack
- Frontend: React (CRA), Tailwind 3.4, shadcn/ui, lucide-react, recharts
- Backend: FastAPI, MongoDB (GridFS), PyMuPDF for PDF signing
- Auth: JWT (custom) + Emergent-managed Google OAuth
- Integrations planned: OpenAI TTS (Emergent LLM key), Stripe, Resend

## Routes (logged-in)
- `/dashboard` — original dashboard (stats, quota, envelope list, chart)
- `/new` — new envelope wizard
- `/documents` — focused envelope list with search + status filter ⭐ new
- `/templates` — template library
- `/reports` — KPIs + 7-day trend + status pie + by-status breakdown ⭐ new
- `/usage` — full-page quota meter, plan card, billing cycle ⭐ new
- `/settings` — profile, business details, billing tabs

## What's been implemented
- 2026-02-XX
  - Admin panel: metrics, billing, refunds, audit log endpoints + UI
  - Distinct demo + super-admin credentials
  - UK-branded marketing copy & meta tags
  - 500-docs/month Pro quota + dashboard widget
  - Solutions dropdown + Real Estate / Staffing Agency landing pages
- 2026-06-13
  - Mobile login/register: switched to `min-h-dvh` + `items-start lg:items-center` so the Sign in button is no longer clipped when the iOS/Android keyboard opens. Tightened spacing around "Forgot password?".
  - Fixed transparent Solutions dropdown (`bg-[var(--card)]` → `bg-[var(--c-paper)]`).
  - **New nav items + pages:** Documents, Reports, Usage added to the user sidebar without redesigning the existing shell. Pages reuse existing `/envelopes`, `/stats`, `/usage` APIs.
  - **Avatar upload** (POST/GET/DELETE `/api/auth/avatar`) — stored in GridFS, served via public endpoint; UI in `/settings` Profile tab; shown in AppShell sidebar.
  - **10-minute idle auto-logout** with 60-second warning toast and cross-tab sync; sign-in toast on `/login?reason=idle`. Implemented via `IdleLogoutGuard` + `useIdleLogout` hook.
  - **Blog search bar** with real-time filter + clear button; empty state quotes the query.
  - **Careers search bar** with real-time filter + clear button.
  - **Dark mode toggle** — CSS variable swap on `html[data-theme="dark"]`, persisted in `localStorage('cs_theme')`, respects `prefers-color-scheme` on first visit. Toggle rendered in SiteHeader, AppShell, and the lightweight Careers header.
- 2026-02-14
  - **PDF viewer fix (P0)**: Added `Promise.withResolvers` polyfill in `/app/frontend/src/lib/polyfills.js`, imported at the top of `index.js` *before* any pdfjs/react-pdf module loads. Resolves `TypeError: Promise.withResolvers is not a function` on browsers < Chrome 119 / Safari 17.4, restoring document rendering in `PrepareStudio` and the signer flow.
  - **Sign-out routing fix (P1)**: `clear_auth_cookies` in `backend/auth.py` now passes `samesite="none", secure=True, path="/"` to `response.delete_cookie` (matching the set-cookie attributes) so the browser actually removes the session cookie. AppShell + AdminShell logout handlers now hard-redirect via `window.location.replace` so route guards re-evaluate against a clean state — refresh-after-signout stays on `/login` (or `/admin/login`) instead of bouncing back into the app.
  - **PDF worker MIME fix (P0 Safari/Firefox)**: Renamed `/public/pdf.worker.min.mjs` → `pdf.worker.min.js` and updated `/app/frontend/src/lib/pdf.js`. Cloudflare served `.mjs` as `application/octet-stream` + `nosniff`, which Firefox & Safari refused to execute. `.js` now serves as `application/javascript` so the worker loads everywhere.
  - **Resend email live**: Updated `RESEND_API_KEY` + `SENDER_EMAIL=noreply@civicsign.co.uk` (matches the user's verified domain). Verified signup/verification/password-reset/signing-invite emails all send and return Resend message IDs. *Production env vars still need to be configured separately by the user in the Emergent deploy panel.*
  - **Favicon set**: Created `/public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `logo192.png`, `logo512.png`, and `manifest.json`. Wired up in `index.html`. Teal CIVICSIGN wave on dark navy rounded square — matches the in-app `<Logo>`. Adds PWA install support (theme #0F1720, paper-cream background).
  - **Mobile PrepareStudio (P1)**: Full Zoho-style mobile parity. Replaced the "use larger screen" footer with a sticky bottom toolbar (Recipients button + green Fields button). Tapping either opens a Radix bottom Sheet with the existing Recipients / Signing-order / Field-palette panels (extracted into `renderPanels()` and reused on desktop sidebar). Picking a field auto-closes the sheet so the user immediately taps the doc to place. Top toolbar collapses on mobile (back arrow, truncated title, single Send icon). Touch placement works via existing Pointer Events.
  - **Mobile SignerFlow tightening**: Header shrinks to h-14 on mobile, "Finish & Sign" condenses to "Sign", Decline button uses tighter padding so it doesn't overflow on iPhone-sized viewports.

## Roadmap (P0/P1/P2)
- **P0**: Cinematic Security & Trust page at `/security` with OpenAI TTS ("fable") via Emergent LLM key.
- **P1**: Stripe payments (key pending).
- **P1**: Resend transactional emails (key pending).
- **P2**: Refactor `bg-[var(--card)]` callsites (60+) to `bg-[var(--c-paper)]` or fix the `--card` HSL definition.
- **P2**: Refactor `server.py` into `/app/backend/routes/`.

## Test credentials
See `/app/memory/test_credentials.md`.
