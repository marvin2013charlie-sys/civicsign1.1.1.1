# CivicSign Red-Team Security Notes

**Audit date:** July 2026  
**Scope:** Full-stack (`backend/` + `frontend/`)  
**Method:** Static code review + live API probes (ethical / authorised on own deployment)

---

## Executive summary

| Severity | Found | Fixed |
|----------|-------|-------|
| CRITICAL | 0 | — |
| HIGH | 3 | 3 |
| MEDIUM | 9 | 9 |
| LOW | 5 | 3 |

**Overall:** Documents are now **encrypted at rest** (AES-256-GCM per envelope/template scope). **Staff and impersonation sessions cannot download PDF bytes.** Passwords use **bcrypt cost 12**; password change/reset **invalidates all refresh tokens** via `token_version`.

---

## Document encryption & access (NEW)

| Control | Implementation |
|---------|----------------|
| Encryption at rest | `document_crypto.py` — AES-256-GCM, scope key derived from `DOCUMENT_ENCRYPTION_KEY` + envelope/template ID |
| Sender access | Owner only, real user session — blocked for `admin`/`staff` roles and `imp` JWT claim |
| Signer access | Valid signing token on `/api/sign/{token}/file` — decrypts with envelope scope |
| Support impersonation | JWT minted with `imp: true` — file + AI endpoints return **403** |
| Admin panel | No document download routes; envelope listings strip `file_id` |
| Legacy PDFs | Unencrypted GridFS objects still readable until re-uploaded |

**Env:** set `DOCUMENT_ENCRYPTION_KEY` to a base64-encoded 32-byte key in production (falls back to JWT-derived key in local dev only).

---

## What an attacker could NOT easily do (good news)

| Attack | Result |
|--------|--------|
| List all envelopes without login | **401** — auth required |
| Access `/api/admin/*` without staff JWT | **401/403** — server enforced |
| Staff view customer PDF during impersonation | **403** — encrypted + session blocked |
| Forge Stripe webhook to upgrade plan | **Blocked** — signature verification |
| Tamper `plan` in MongoDB | **Ignored** — HMAC `plan_signature` check |
| Guess signing token (`uuid4` 128-bit) | **Impractical** at scale |
| XSS via envelope title / comments | **Not found** — React escapes text |
| CSRF on cookie session | **Mitigated** — `SameSite=strict` + HttpOnly cookies |

---

## HIGH — exploit paths (all fixed)

### 1. GridFS file theft via avatar URL — FIXED

`GET /api/auth/avatar/{file_id}` no longer serves arbitrary GridFS IDs.

### 2. SMS signer OTP brute-force — FIXED

Rate limit + 5-attempt lockout on `/api/sign/{token}/auth/verify`.

### 3. Webhook SSRF — FIXED

`validate_webhook_url()` blocks private/metadata targets.

---

## MEDIUM — exploit paths (all fixed)

| # | Issue | Fix |
|---|-------|-----|
| 4 | KBA postcode guessing | Shared attempt counter + rate limits |
| 5 | Quota/credit race | Atomic `reserve_user_quota` / `reserve_org_quota` in `enforce_quota()` |
| 6 | Downgrade keeps admin quota | Cleared on free downgrade |
| 7 | PowerForm phishing links | `validate_redirect_base()` |
| 8 | Contact IDOR | `owner_id` on update |
| 9 | Contact search ReDoS | `re.escape()` |
| 10 | JWT survives password reset | `token_version` claim on access + refresh tokens |
| 11 | Signer endpoint flooding | Per-IP limits on all `/api/sign/*` routes |
| 12 | Impersonation OTP brute | 5 failed attempts → lockout |

---

## LOW — remaining backlog

| Issue | Status |
|-------|--------|
| JWT in login JSON (XSS steals Bearer) | **Open** — cookies are HttpOnly; prefer cookie-only for browser |
| `DEV_MODE=true` in prod | **Mitigated** — startup fails unless Mongo/CORS look local |
| `setUser()` in React DevTools | Cosmetic — API still 403 |
| `backend/.env` in project copy | Rotate secrets if folder was shared |

---

## Files changed (encryption + hardening pass)

- `backend/document_crypto.py` — AES-GCM encryption
- `backend/document_access.py` — sender/signer/staff access rules
- `backend/db.py` — encrypted GridFS upload/download
- `backend/auth.py` — `token_version`, impersonation claim, password invalidation
- `backend/admin.py` — impersonation token + OTP lockout
- `backend/usage_ledger.py` — atomic quota reservation
- `backend/organizations.py` — atomic enforce + rollback helper
- `backend/schema.py` — `org_usage_ledger` collection
- `backend/server.py` — encrypted documents, access checks, CSP headers, signer rate limits
- `backend/document_ai.py` — encrypted read + impersonation block
- `backend/security_utils.py` — production DEV_MODE guard, security headers
- `backend/powerforms.py`, `backend/sample_templates.py` — encrypted template/envelope copies

---

## Recommended next steps

1. Set `DOCUMENT_ENCRYPTION_KEY` in production (32 random bytes, base64)
2. Remove `access_token` from login JSON for browser clients
3. Rotate secrets if this project folder was ever shared publicly
4. Re-upload or migrate legacy plaintext GridFS documents if full encryption coverage is required

---

*This document is for authorised defensive use on CivicSign deployments you own or are contracted to test.*