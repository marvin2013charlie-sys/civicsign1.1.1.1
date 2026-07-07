"""Immutable monthly document usage — deleting envelopes does not refund quota."""
import logging
from datetime import datetime, timezone
from typing import Optional

from pymongo.errors import DuplicateKeyError

from billing_cycle import period_for_org, period_for_user
from db import db

logger = logging.getLogger("civicsign.usage_ledger")

_RESERVE_RETRIES = 6


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def resolve_user_period(owner_id: str) -> dict:
    user = await db.users.find_one({"user_id": owner_id}, {"_id": 0, "created_at": 1})
    return period_for_user(user.get("created_at") if user else None)


async def resolve_org_period(org_id: str) -> dict:
    org = await db.organizations.find_one({"org_id": org_id}, {"_id": 0, "created_at": 1})
    return period_for_org(org.get("created_at") if org else None)


async def _live_envelope_count(owner_id: str, period_start_iso: str) -> int:
    return await db.envelopes.count_documents({
        "owner_id": owner_id,
        "created_at": {"$gte": period_start_iso},
    })


async def get_monthly_usage(owner_id: str, period: Optional[dict] = None) -> int:
    """
    Return documents counted against this user's quota for the current billing period.
    Backfills from existing envelopes once so legacy data is not under-counted.
    """
    if period is None:
        period = await resolve_user_period(owner_id)
    key = period["period_key"]
    start_iso = period["period_start_iso"]
    entry = await db.usage_ledger.find_one(
        {"owner_id": owner_id, "month": key},
        {"_id": 0, "count": 1},
    )
    ledger = int(entry.get("count", 0)) if entry else 0

    if ledger == 0:
        live = await _live_envelope_count(owner_id, start_iso)
        if live > 0:
            await db.usage_ledger.update_one(
                {"owner_id": owner_id, "month": key},
                {
                    "$max": {"count": live},
                    "$set": {"updated_at": _now()},
                    "$setOnInsert": {"created_at": _now()},
                },
                upsert=True,
            )
            ledger = live
    return ledger


async def get_org_monthly_usage(
    member_ids: list[str],
    org_id: Optional[str] = None,
    period: Optional[dict] = None,
) -> int:
    if not member_ids:
        return 0
    if period is None and org_id:
        period = await resolve_org_period(org_id)
    if period is None:
        period = period_for_user(None)
    key = period["period_key"]
    if org_id:
        entry = await db.org_usage_ledger.find_one(
            {"org_id": org_id, "month": key},
            {"_id": 0, "count": 1},
        )
        if entry is not None:
            return int(entry.get("count", 0))
    total = 0
    for uid in member_ids:
        total += await get_monthly_usage(uid, period)
    if org_id and total > 0:
        await db.org_usage_ledger.update_one(
            {"org_id": org_id, "month": key},
            {
                "$max": {"count": total},
                "$set": {"updated_at": _now()},
                "$setOnInsert": {"created_at": _now()},
            },
            upsert=True,
        )
    return total


async def _ledger_count(owner_id: str, period: dict) -> int:
    key = period["period_key"]
    entry = await db.usage_ledger.find_one(
        {"owner_id": owner_id, "month": key},
        {"_id": 0, "count": 1},
    )
    return int(entry.get("count", 0)) if entry else 0


async def _inc_ledger(
    owner_id: str,
    count: int,
    period: dict,
    org_id: Optional[str] = None,
) -> None:
    key = period["period_key"]
    now = _now()
    update: dict = {
        "$inc": {"count": count},
        "$set": {"updated_at": now},
        "$setOnInsert": {"created_at": now},
    }
    if org_id:
        update["$setOnInsert"]["org_id"] = org_id
    await db.usage_ledger.update_one(
        {"owner_id": owner_id, "month": key},
        update,
        upsert=True,
    )


async def reserve_user_quota(
    owner_id: str,
    limit: int,
    count: int = 1,
    org_id: Optional[str] = None,
    period: Optional[dict] = None,
) -> int:
    """
    Atomically reserve quota for a user in the current billing period.
    Returns extra_document_credits consumed (0 if within included allowance).
    """
    if count < 1:
        return 0
    if period is None:
        period = await resolve_user_period(owner_id)
    if limit < 0:
        await _inc_ledger(owner_id, count, period, org_id)
        return 0

    credits_consumed = 0
    key = period["period_key"]
    for _ in range(_RESERVE_RETRIES):
        current = await _ledger_count(owner_id, period)
        projected = current + count
        if projected <= limit:
            result = await db.usage_ledger.update_one(
                {
                    "owner_id": owner_id,
                    "month": key,
                    "count": current,
                },
                {
                    "$inc": {"count": count},
                    "$set": {"updated_at": _now()},
                    "$setOnInsert": {
                        "created_at": _now(),
                        **({"org_id": org_id} if org_id else {}),
                    },
                },
                upsert=True,
            )
            if result.modified_count or (result.upserted_id and current == 0):
                return credits_consumed
            if current == 0:
                try:
                    await db.usage_ledger.insert_one({
                        "owner_id": owner_id,
                        "month": key,
                        "count": count,
                        "created_at": _now(),
                        "updated_at": _now(),
                        **({"org_id": org_id} if org_id else {}),
                    })
                    return credits_consumed
                except DuplicateKeyError:
                    continue
            continue

        overage = projected - limit
        debit = await db.users.find_one_and_update(
            {
                "user_id": owner_id,
                "extra_document_credits": {"$gte": overage},
            },
            {"$inc": {"extra_document_credits": -overage}},
        )
        if not debit:
            break
        credits_consumed = overage
        await _inc_ledger(owner_id, count, period, org_id)
        return credits_consumed

    return -1


async def release_user_quota(
    owner_id: str,
    count: int = 1,
    credits_consumed: int = 0,
    period: Optional[dict] = None,
) -> None:
    """Rollback a failed envelope create after quota was reserved."""
    if count < 1:
        return
    if period is None:
        period = await resolve_user_period(owner_id)
    await db.usage_ledger.update_one(
        {"owner_id": owner_id, "month": period["period_key"]},
        {"$inc": {"count": -count}, "$set": {"updated_at": _now()}},
    )
    if credits_consumed > 0:
        await db.users.update_one(
            {"user_id": owner_id},
            {"$inc": {"extra_document_credits": credits_consumed}},
        )


async def reserve_org_quota(
    org_id: str,
    limit: int,
    count: int = 1,
    period: Optional[dict] = None,
) -> bool:
    """Atomically reserve from a shared organisation pool."""
    if count < 1:
        return True
    if limit < 0:
        return True
    if period is None:
        period = await resolve_org_period(org_id)
    key = period["period_key"]
    for _ in range(_RESERVE_RETRIES):
        entry = await db.org_usage_ledger.find_one(
            {"org_id": org_id, "month": key},
            {"_id": 0, "count": 1},
        )
        current = int(entry.get("count", 0)) if entry else 0
        if current + count > limit:
            return False
        if entry:
            result = await db.org_usage_ledger.update_one(
                {"org_id": org_id, "month": key, "count": current},
                {"$inc": {"count": count}, "$set": {"updated_at": _now()}},
            )
            if result.modified_count:
                return True
        else:
            try:
                await db.org_usage_ledger.insert_one({
                    "org_id": org_id,
                    "month": key,
                    "count": count,
                    "created_at": _now(),
                    "updated_at": _now(),
                })
                return True
            except DuplicateKeyError:
                continue
    return False


async def release_org_quota(
    org_id: str,
    count: int = 1,
    period: Optional[dict] = None,
) -> None:
    if count < 1:
        return
    if period is None:
        period = await resolve_org_period(org_id)
    await db.org_usage_ledger.update_one(
        {"org_id": org_id, "month": period["period_key"]},
        {"$inc": {"count": -count}, "$set": {"updated_at": _now()}},
    )