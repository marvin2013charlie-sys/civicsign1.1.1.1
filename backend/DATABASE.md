# CivicSign Database

MongoDB, accessed via Motor (async). One database, configured by `.env`:

```
MONGO_URL=mongodb://localhost:27017     # or mongodb+srv://... for Atlas
DB_NAME=civicsign
```

## Collections

| Collection | Purpose | Key indexes |
|---|---|---|
| `users` | Accounts (user / staff / admin) | `email` (unique), `user_id` (unique) |
| `envelopes` | Documents + recipients + fields | `owner_id`, `envelope_id` (unique), `recipients.access_token`, `status`, `expires_at` |
| `templates` | Reusable templates (feature WIP) | `owner_id`, `template_id` (unique) |
| `payment_transactions` | Stripe billing ledger | `session_id`, `user_id` |
| `admin_audit` | Admin action history | `at`, `action` |
| `impersonation_otps` | Consent OTPs for account access | `request_id`, **TTL** `expire_at` |
| `email_verifications` | Signup 6-digit codes | `email` (unique), **TTL** `expire_at` |
| `password_resets` | One-time reset tokens | `token` (unique), **TTL** `expire_at` |
| `fs.files` / `fs.chunks` | GridFS — stored PDF bytes | driver-managed |

All collections, indexes, TTLs, and validators are defined once in
[`schema.py`](schema.py) and applied idempotently on startup via
`ensure_database(db)`. `GET /api/health` reports liveness + DB reachability.

## Server-side validation

Every collection carries a MongoDB `$jsonSchema` validator
(`validationLevel: "moderate"`, `validationAction: "error"`): the database itself
rejects writes that are missing required identifiers or use wrong types / invalid
enums (e.g. a `role` outside user/staff/admin, or a `plan` outside free/pro/business).
Schemas are permissive (`additionalProperties: true`, minimal `required`) so they
enforce integrity without breaking legacy or future-extended documents.

## TTL / auto-cleanup

`impersonation_otps`, `email_verifications`, and `password_resets` each carry a
real BSON date field `expire_at`. A TTL index (`expireAfterSeconds=0`) makes
MongoDB delete these documents automatically once they expire — no cron needed.
(The human-readable `expires_at` ISO string is kept for app logic.)

## Privacy

Document bytes (GridFS) are only ever served by owner-scoped endpoints. No admin
or staff endpoint returns file bytes or file ids — support staff can only view a
user's documents by entering the account through the consent-OTP flow.

## Moving to MongoDB Atlas

1. Create a free/shared cluster at cloud.mongodb.com, add a database user, and
   allow-list your server IP (or `0.0.0.0/0` for testing).
2. Copy the SRV connection string: `mongodb+srv://USER:PASS@cluster.xxxx.mongodb.net/?retryWrites=true&w=majority`.
3. Migrate existing data:
   ```
   .venv/bin/python migrate_to_atlas.py --dest "<atlas-srv-url>" --dest-db civicsign
   ```
4. Point `.env` `MONGO_URL` at the Atlas URL and restart. Indexes recreate on startup.

`dnspython` (for `mongodb+srv://`) is already in `requirements.txt`.
