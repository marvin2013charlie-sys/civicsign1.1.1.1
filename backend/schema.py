"""CivicSign database schema — single source of truth.

Defines every collection, its indexes, and a MongoDB `$jsonSchema` validator.
`ensure_database()` applies all of it idempotently on startup, so the database
is self-describing and integrity is enforced at the server, not just in app code.

Safety notes:
- Validators use validationLevel="moderate" (only checks inserts and updates to
  already-valid docs) and permissive schemas (`additionalProperties: true`,
  minimal `required`). This enforces the essentials without rejecting legacy or
  future-extended documents.
- TTL indexes on `expire_at` let MongoDB auto-purge ephemeral records.
"""
import logging

logger = logging.getLogger("civicsign.schema")

# String helpers for validators
_STR = {"bsonType": "string"}
_STR_OR_NULL = {"bsonType": ["string", "null"]}
_BOOL = {"bsonType": "bool"}
_NUM = {"bsonType": ["double", "int", "long"]}


def _obj(required, props):
    return {
        "$jsonSchema": {
            "bsonType": "object",
            "required": required,
            "additionalProperties": True,
            "properties": props,
        }
    }


# --- Per-collection definition: indexes + validator -------------------------
# index tuple: (keys, options_dict)
COLLECTIONS = {
    "users": {
        "indexes": [
            ([("email", 1)], {"unique": True}),
            ([("user_id", 1)], {"unique": True}),
            ([("role", 1)], {}),
            ([("org_id", 1)], {"sparse": True}),
        ],
        "validator": _obj(
            ["user_id", "email"],
            {
                "user_id": _STR,
                "email": _STR,
                "name": _STR,
                "password_hash": _STR_OR_NULL,
                "role": {"enum": ["user", "staff", "admin"]},
                "plan": {"enum": ["free", "pro", "business"]},
                "active": _BOOL,
                "email_verified": _BOOL,
                "permissions": {"bsonType": "array"},
            },
        ),
    },
    "envelopes": {
        "indexes": [
            ([("envelope_id", 1)], {"unique": True}),
            ([("owner_id", 1)], {}),
            ([("recipients.access_token", 1)], {}),
            ([("status", 1)], {}),
            ([("expires_at", 1)], {}),
        ],
        "validator": _obj(
            ["envelope_id", "owner_id"],
            {
                "envelope_id": _STR,
                "owner_id": _STR,
                "title": _STR,
                "status": {
                    "enum": [
                        "draft", "sent", "viewed", "completing", "completed",
                        "declined", "voided", "expired",
                    ]
                },
                "signing_order": {"enum": ["sequential", "parallel"]},
                "recipients": {"bsonType": "array"},
                "fields": {"bsonType": "array"},
                "audit_events": {"bsonType": "array"},
            },
        ),
    },
    "templates": {
        "indexes": [
            ([("template_id", 1)], {"unique": True}),
            ([("owner_id", 1)], {}),
            ([("team_id", 1)], {"sparse": True}),
            ([("shared_with_team", 1)], {}),
        ],
        "validator": _obj(
            ["template_id"],
            {
                "template_id": _STR,
                "owner_id": _STR,
                "name": _STR,
                "team_id": _STR_OR_NULL,
                "shared_with_team": _BOOL,
            },
        ),
    },
    "contacts": {
        "indexes": [
            ([("contact_id", 1)], {"unique": True}),
            ([("owner_id", 1)], {}),
            ([("owner_id", 1), ("email", 1)], {"unique": True}),
        ],
        "validator": _obj(
            ["contact_id", "owner_id", "email"],
            {"contact_id": _STR, "owner_id": _STR, "email": _STR, "name": _STR},
        ),
    },
    "signer_signatures": {
        "indexes": [
            ([("email", 1)], {"unique": True}),
        ],
        "validator": _obj(
            ["email", "signature_data"],
            {"email": _STR, "signature_data": _STR},
        ),
    },
    "organizations": {
        "indexes": [
            ([("org_id", 1)], {"unique": True}),
            ([("name", 1)], {}),
        ],
        "validator": _obj(
            ["org_id", "name"],
            {
                "org_id": _STR,
                "name": _STR,
                "monthly_envelope_limit": {"bsonType": ["int", "long", "double", "null"]},
                "enterprise_unlimited": _BOOL,
            },
        ),
    },
    "teams": {
        "indexes": [
            ([("team_id", 1)], {"unique": True}),
            ([("owner_id", 1)], {}),
            ([("members.user_id", 1)], {}),
        ],
        "validator": _obj(
            ["team_id", "name", "owner_id"],
            {"team_id": _STR, "name": _STR, "owner_id": _STR, "members": {"bsonType": "array"}},
        ),
    },
    "comments": {
        "indexes": [
            ([("comment_id", 1)], {"unique": True}),
            ([("envelope_id", 1)], {}),
            ([("created_at", 1)], {}),
        ],
        "validator": _obj(
            ["comment_id", "envelope_id", "author_id", "body"],
            {
                "comment_id": _STR,
                "envelope_id": _STR,
                "author_id": _STR,
                "author_name": _STR,
                "body": _STR,
                "page": {"bsonType": ["int", "long", "double"]},
                "parent_id": _STR_OR_NULL,
            },
        ),
    },
    "team_invites": {
        "indexes": [
            ([("invite_id", 1)], {"unique": True}),
            ([("team_id", 1)], {}),
            ([("email", 1)], {}),
        ],
        "validator": _obj(
            ["invite_id", "team_id", "email"],
            {"invite_id": _STR, "team_id": _STR, "email": _STR},
        ),
    },
    "payment_transactions": {
        "indexes": [
            ([("session_id", 1)], {"unique": True}),
            ([("tx_id", 1)], {"unique": True}),
            ([("user_id", 1)], {}),
        ],
        "validator": _obj(
            ["session_id", "user_id"],
            {
                "session_id": _STR,
                "user_id": _STR,
                "plan_id": {"enum": ["pro", "business"]},
                "amount": _NUM,
                "currency": _STR,
                "processed": _BOOL,
            },
        ),
    },
    "admin_audit": {
        "indexes": [
            ([("at", -1)], {}),
            ([("action", 1)], {}),
            ([("admin_id", 1)], {}),
        ],
        "validator": _obj(["action"], {"action": _STR, "admin_id": _STR, "at": _STR}),
    },
    "blog_posts": {
        "indexes": [
            ([("slug", 1)], {"unique": True}),
            ([("published", 1)], {}),
        ],
        "validator": _obj(
            ["slug", "title"],
            {"slug": _STR, "title": _STR, "published": _BOOL, "body": {"bsonType": "array"}},
        ),
    },
    "job_posts": {
        "indexes": [
            ([("slug", 1)], {"unique": True}),
            ([("job_id", 1)], {"unique": True}),
            ([("published", 1)], {}),
        ],
        "validator": _obj(
            ["job_id", "slug", "title"],
            {"job_id": _STR, "slug": _STR, "title": _STR, "published": _BOOL},
        ),
    },
    "job_applications": {
        "indexes": [
            ([("application_id", 1)], {"unique": True}),
            ([("job_slug", 1)], {}),
            ([("status", 1)], {}),
        ],
        "validator": _obj(
            ["application_id", "email"],
            {"application_id": _STR, "email": _STR, "job_slug": _STR, "status": _STR},
        ),
    },
    "contact_messages": {
        "indexes": [
            ([("contact_id", 1)], {"unique": True}),
            ([("handled", 1)], {}),
        ],
        "validator": _obj(
            ["contact_id", "email"],
            {"contact_id": _STR, "email": _STR, "handled": _BOOL},
        ),
    },
    "usage_ledger": {
        "indexes": [
            ([("owner_id", 1), ("month", 1)], {"unique": True}),
            ([("month", 1)], {}),
            ([("org_id", 1)], {"sparse": True}),
        ],
        "validator": _obj(
            ["owner_id", "month"],
            {"owner_id": _STR, "month": _STR, "count": _NUM, "org_id": _STR_OR_NULL},
        ),
    },
    "org_usage_ledger": {
        "indexes": [
            ([("org_id", 1), ("month", 1)], {"unique": True}),
            ([("month", 1)], {}),
        ],
        "validator": _obj(
            ["org_id", "month"],
            {"org_id": _STR, "month": _STR, "count": _NUM},
        ),
    },
    # --- Ephemeral collections: TTL auto-purge on `expire_at` (BSON date) ---
    "impersonation_otps": {
        "indexes": [
            ([("request_id", 1)], {}),
            ([("expire_at", 1)], {"expireAfterSeconds": 0}),
        ],
        "validator": _obj(["request_id", "target_user_id"], {"request_id": _STR, "used": _BOOL}),
    },
    "email_verifications": {
        "indexes": [
            ([("email", 1)], {"unique": True}),
            ([("expire_at", 1)], {"expireAfterSeconds": 0}),
        ],
        "validator": _obj(["email", "code"], {"email": _STR, "code": _STR}),
    },
    "password_resets": {
        "indexes": [
            ([("token", 1)], {"unique": True}),
            ([("user_id", 1)], {}),
            ([("expire_at", 1)], {"expireAfterSeconds": 0}),
        ],
        "validator": _obj(["token", "user_id"], {"token": _STR, "user_id": _STR, "used": _BOOL}),
    },
    "login_attempts": {
        "indexes": [
            ([("email", 1)], {"unique": True}),
            ([("expire_at", 1)], {"expireAfterSeconds": 0}),
        ],
        "validator": _obj(["email"], {"email": _STR}),
    },
    "pdf_workspaces": {
        "indexes": [
            ([("workspace_id", 1)], {"unique": True}),
            ([("owner_id", 1)], {}),
        ],
        "validator": _obj(
            ["workspace_id", "owner_id", "file_id"],
            {
                "workspace_id": _STR,
                "owner_id": _STR,
                "file_id": _STR,
                "filename": _STR,
                "page_count": {"bsonType": ["int", "long", "double"]},
                "pages": {"bsonType": "array"},
            },
        ),
    },
}


async def ensure_database(db):
    """Idempotently create collections, indexes, and validators. Never destructive."""
    existing = set(await db.list_collection_names())

    for name, spec in COLLECTIONS.items():
        validator = spec.get("validator")
        # Create the collection with its validator, or apply the validator to an
        # existing one via collMod. validationLevel "moderate" spares legacy docs.
        try:
            if name not in existing:
                await db.create_collection(
                    name,
                    validator=validator,
                    validationLevel="moderate",
                    validationAction="error",
                )
            elif validator:
                await db.command({
                    "collMod": name,
                    "validator": validator,
                    "validationLevel": "moderate",
                    "validationAction": "error",
                })
        except Exception as e:
            logger.warning(f"[schema] validator for {name}: {e}")

        # Indexes (idempotent — Mongo no-ops if identical).
        for keys, opts in spec.get("indexes", []):
            try:
                await db[name].create_index(keys, **opts)
            except Exception as e:
                logger.warning(f"[schema] index {keys} on {name}: {e}")

    logger.info(f"[schema] ensured {len(COLLECTIONS)} collections with indexes + validators")
