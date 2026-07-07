"""Billing-period helpers — document quota resets on signup anniversary (not calendar month)."""
import calendar
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger("civicsign.billing_cycle")


def _parse_iso(iso_str: Optional[str]) -> Optional[datetime]:
    if not iso_str:
        return None
    try:
        s = str(iso_str).replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def _clamp_day(year: int, month: int, anchor_day: int) -> int:
    return min(anchor_day, calendar.monthrange(year, month)[1])


def _period_start(year: int, month: int, anchor_day: int) -> datetime:
    day = _clamp_day(year, month, anchor_day)
    return datetime(year, month, day, 0, 0, 0, tzinfo=timezone.utc)


def calendar_month_period(now: Optional[datetime] = None) -> dict:
    """Fallback when no signup anchor exists (legacy accounts)."""
    now = now or datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = datetime(start.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(start.year, start.month + 1, 1, tzinfo=timezone.utc)
    return {
        "period_key": start.strftime("%Y-%m"),
        "period_start_iso": start.isoformat(),
        "period_end_iso": end.isoformat(),
        "label": start.strftime("%B %Y"),
        "resets_at": end.isoformat(),
        "resets_label": end.strftime("%d %B %Y"),
        "billing_cycle": "calendar",
    }


def anniversary_period(anchor_iso: Optional[str], now: Optional[datetime] = None) -> dict:
    """
    Rolling monthly window anchored to the user's (or org's) signup date.
    Example: signed up 15 Jan → cycle is 15 Jan–14 Feb, 15 Feb–14 Mar, etc.
    """
    now = now or datetime.now(timezone.utc)
    anchor = _parse_iso(anchor_iso)
    if not anchor:
        return calendar_month_period(now)

    anchor_day = anchor.day
    start = _period_start(now.year, now.month, anchor_day)
    if now < start:
        if now.month == 1:
            start = _period_start(now.year - 1, 12, anchor_day)
        else:
            start = _period_start(now.year, now.month - 1, anchor_day)

    if start.month == 12:
        end = _period_start(start.year + 1, 1, anchor_day)
    else:
        end = _period_start(start.year, start.month + 1, anchor_day)

    last_inclusive = end - timedelta(days=1)
    return {
        "period_key": start.strftime("%Y-%m-%d"),
        "period_start_iso": start.isoformat(),
        "period_end_iso": end.isoformat(),
        "label": f"{start.strftime('%d %b %Y')} – {last_inclusive.strftime('%d %b %Y')}",
        "resets_at": end.isoformat(),
        "resets_label": end.strftime("%d %B %Y"),
        "billing_cycle": "anniversary",
        "anchor_day": anchor_day,
    }


def period_for_user(created_at: Optional[str], now: Optional[datetime] = None) -> dict:
    return anniversary_period(created_at, now)


def period_for_org(created_at: Optional[str], now: Optional[datetime] = None) -> dict:
    return anniversary_period(created_at, now)