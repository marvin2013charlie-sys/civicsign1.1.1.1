# CivicSign — Deployment Guide

## Architecture

```
  civicsign.co.uk        → Cloudflare (static frontend build — already live)
  api.civicsign.co.uk    → Render     (FastAPI backend — this guide)
  MongoDB Atlas          → cluster0.ycpghu9.mongodb.net (already live)
  Resend                 → transactional email (already live)
```

The frontend talks to the backend cross-origin using a **Bearer token**
(`localStorage.cs_token` → `Authorization` header). CORS on the backend allows
`https://civicsign.co.uk`. No same-origin proxy is required.

---

## 1. Backend → Render

1. Push this repo to GitHub (`marvin2013charlie-sys/civicsign1.1.1.1`).
2. Render Dashboard → **New → Blueprint** → select this repo. Render reads
   [`render.yaml`](render.yaml) and creates the `civicsign-api` web service
   (Docker, region `frankfurt`, health check `/api/health`).
3. Set the **secret** env vars (marked `sync:false`) in the Render dashboard —
   copy the current values from `backend/.env`:

   | Key | Value |
   |---|---|
   | `MONGO_URL` | the Atlas SRV string |
   | `JWT_SECRET` | the 48-byte secret |
   | `PLAN_ENCRYPTION_SECRET` | the 48-byte secret |
   | `RESEND_API_KEY` | `re_...` |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | user seed account |
   | `INTERNAL_ADMIN_EMAIL` / `INTERNAL_ADMIN_PASSWORD` | admin seed account |
   | `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` | when billing goes live |

   Non-secret vars (`DB_NAME`, `CORS_ORIGINS`, `PUBLIC_SITE_URL`, `SENDER_EMAIL`,
   `SENDER_NAME`) are already baked into `render.yaml`.
4. Deploy. When it's green, note the Render URL (e.g. `civicsign-api.onrender.com`)
   and confirm `https://<render-url>/api/health` returns `{"status":"ok",...}`.

## 2. Custom domain `api.civicsign.co.uk`

1. Render → the service → **Settings → Custom Domains → Add** `api.civicsign.co.uk`.
   Render shows a target hostname.
2. Cloudflare → `civicsign.co.uk` DNS → **Add record**: `CNAME`, name `api`,
   target = the Render hostname. Set proxy to **DNS only (grey cloud)** initially
   so Render can issue the TLS cert; you can enable the orange proxy afterwards.
3. Wait for Render to show the domain as verified + certificate issued.

## 3. Frontend → point at the API

The frontend reads `REACT_APP_BACKEND_URL` **at build time** (CRA bakes it in).

1. In your Cloudflare Pages project → **Settings → Environment variables**, set:
   ```
   REACT_APP_BACKEND_URL = https://api.civicsign.co.uk
   ```
2. **Redeploy the frontend.** This is also required to publish the recent changes
   (the inline email-logo asset, the honest help widget, the API base fix, etc.).

> Local dev is unaffected: with `REACT_APP_BACKEND_URL` unset, `api.js` uses a
> relative `/api` and `setupProxy.js` forwards to the local backend on :8001.

## 4. Lock down access

- **Atlas Network Access:** replace the temporary `0.0.0.0/0` allow-list with
  Render's outbound IPs (Render → service → **Connect** shows them), or keep
  `0.0.0.0/0` only if the DB user password is strong and rotated.
- **CORS:** already restricted to `https://civicsign.co.uk`. Add `https://www.civicsign.co.uk`
  to `CORS_ORIGINS` (comma-separated) if you serve the `www` host too.

## 5. Post-deploy verification

- [ ] `https://api.civicsign.co.uk/api/health` → `200`
- [ ] Log in on `https://civicsign.co.uk` (admin + user) → dashboard loads
- [ ] Register a throwaway account → verification email arrives (branded logo)
- [ ] Password reset flow → email arrives, link works
- [ ] Upload a PDF, add fields, send → signing link works end-to-end
- [ ] Admin console loads at `/admin` for the internal account

---

## Secrets to rotate before real launch
These have appeared in setup transcripts and should be rotated once:
- Atlas database-user password (then update `MONGO_URL`)
- Resend API key

## Notes
- `render.yaml` uses the **free** plan to start — no card needed. Free services
  sleep after 15 min idle and take ~30-60s to wake on the next request. When you
  start taking real traffic or enable Stripe webhooks, change `plan: free` to
  `plan: starter` ($7/mo) for an always-on service — that's the only change needed.
- Free tier gives 512MB RAM; the pruned image fits comfortably.
- Backend runtime deps are pinned minimally in `backend/requirements.txt`
  (18 packages — the ~113 unused Emergent-era packages were removed).
