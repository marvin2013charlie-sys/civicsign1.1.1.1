# CIVICSIGN — Product Requirements

## Original problem statement
Replicate the user's private GitHub repo `civicsign` as a UK GDPR-compliant e-signature SaaS, then iteratively extend it with:
- Super-admin panel (metrics, billing, refunds, audit log)
- UK ownership / GDPR-approved positioning across the marketing site
- 500 documents per user/month quota for Pro plan
- Solutions pages for Real Estate and Staffing Agency
- Cinematic "Security & Trust" walkthrough page with AI voiceover (in progress)

## Tech stack
- Frontend: React (CRA), Tailwind 3.4, shadcn/ui, lucide-react
- Backend: FastAPI, MongoDB (GridFS), PyMuPDF for PDF signing
- Auth: JWT (custom) + Emergent-managed Google OAuth
- Integrations planned: OpenAI TTS (Emergent LLM key), Stripe, Resend

## What's been implemented
- 2026-02-XX (earlier in this session)
  - Admin panel: metrics, billing, refunds, audit log endpoints + UI
  - Distinct demo + super-admin credentials
  - UK-branded marketing copy & meta tags
  - 500-docs/month Pro quota + dashboard widget
  - Solutions dropdown + Real Estate / Staffing Agency landing pages
- 2026-06-13
  - **Bug fix — mobile login & register UI**
    - Form was vertically centered with `min-h-screen` + `items-center`, causing the Sign in button to be clipped off-screen when the iOS/Android keyboard opened.
    - Fixed by switching to `min-h-dvh` + `items-start lg:items-center` so the form is top-aligned and scrollable on mobile while remaining centered on desktop.
    - Tightened spacing between the Password label, "Forgot password?" link and the password input (added `gap-2`, normalized `mt-1.5`) to remove visual overlap.
    - Applied same layout fix to `/register`.

## Routes
- Public: `/`, `/about`, `/contact`, `/solutions/real-estate`, `/solutions/staffing-agency`, `/privacy`, `/terms`, `/cookies`, `/login`, `/register`, `/verify-email`, `/reset-password`, `/sign/:token`
- Authed: `/dashboard`, `/new`, `/templates`, `/settings`, `/prepare/:id`, `/send/:id`, `/envelope/:id`
- Admin: `/admin/login`, `/admin`, `/admin/users`, `/admin/users/:userId`, `/admin/envelopes`, `/admin/billing`, `/admin/audit`, `/admin/contacts`

## Roadmap (P0/P1/P2)
- **P0 / In progress**: Cinematic Security & Trust page at `/security` with OpenAI TTS ("fable" voice) via Emergent LLM key
- **P1**: Stripe payments (key pending from user)
- **P1**: Resend transactional emails (key pending from user)
- **P2**: Refactor `server.py` into `/app/backend/routes/`

## Test credentials
See `/app/memory/test_credentials.md`.
