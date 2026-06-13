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

## Roadmap (P0/P1/P2)
- **P0**: Cinematic Security & Trust page at `/security` with OpenAI TTS ("fable") via Emergent LLM key.
- **P1**: Stripe payments (key pending).
- **P1**: Resend transactional emails (key pending).
- **P2**: Refactor `bg-[var(--card)]` callsites (60+) to `bg-[var(--c-paper)]` or fix the `--card` HSL definition.
- **P2**: Refactor `server.py` into `/app/backend/routes/`.

## Test credentials
See `/app/memory/test_credentials.md`.
