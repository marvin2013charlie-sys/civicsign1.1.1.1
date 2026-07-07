#!/usr/bin/env python3
"""Generate a weekly leftover launch roadmap PDF from LAUNCH_ROADMAP.md status."""
from __future__ import annotations

import hashlib
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESKTOP = Path.home() / "Desktop"

INK = (0.071, 0.129, 0.125)
INK_MUTED = (0.361, 0.420, 0.451)
TEAL_LIGHT = (0.494, 0.914, 0.867)
SUCCESS = (0.086, 0.639, 0.290)
WARN = (0.851, 0.467, 0.024)
HEADER_BG = (0.055, 0.169, 0.153)


@dataclass
class Task:
    ref: str
    text: str
    priority: str = ""  # P0, P1, or empty


@dataclass
class WeekPlan:
    title: str
    dates: str
    goal: str
    tasks: list[Task]
    exit_criteria: str


def _pdf_safe(text: str) -> str:
    return (
        text.replace("\u2192", "->")
        .replace("\u2014", "-")
        .replace("\u00a7", "sec.")
        .replace("\u2013", "-")
        .replace("\u2022", "-")
    )


def _weekly_plan(start: datetime) -> list[WeekPlan]:
    def week(n: int) -> str:
        s = start + timedelta(days=7 * (n - 1))
        e = s + timedelta(days=6)
        return f"{s.strftime('%d %b')} - {e.strftime('%d %b %Y')}"

    return [
        WeekPlan(
            f"Week 1 - Stabilise and decide",
            week(1),
            "Close Phase 0 gaps and fix CI blockers before any deploy work.",
            [
                Task("0.1", "Git tag: pre-launch-baseline on civicsign-2026-overhaul", "P0"),
                Task("0.4", "Document every secret to rotate (Atlas, JWT, Stripe, Resend, encryption keys)", "P0"),
                Task("0.5", "Decide launch tier: private beta (recommended) vs public SaaS", "P0"),
                Task("FIX", "Add missing frontend/components/ui/alert-dialog.jsx so npm run build passes", "P0"),
                Task("FIX", "Align pytest login creds with DEV_TEST_LOGINS.txt / backend .env", "P1"),
                Task("FIX", "Add civicsign-2026-overhaul to GitHub Actions CI branch triggers", "P1"),
                Task("1.1", "Start billing decision: Stripe subscriptions OR honest one-time copy", "P0"),
                Task("3.1", "Wire Admin Envelopes route in App.js + AdminShell.jsx nav", "P1"),
            ],
            "Build passes locally; Phase 0 checklist complete; billing path chosen.",
        ),
        WeekPlan(
            f"Week 2 - Marketing truth (Phase 1)",
            week(2),
            "Remove embarrassing gaps between product and public copy.",
            [
                Task("1.1", "Finish billing copy: Terms, Refund, Landing, Settings (match one-time OR subscriptions)", "P0"),
                Task("1.2", "SMS auth: integrate Twilio OR remove SMS from Business marketing", "P0"),
                Task("1.3", "Google sign-in: add OAuth OR remove from Privacy/Cookies", "P0"),
                Task("1.4", "Soften Business plan: fair-use 10k docs, no QES until partner", "P1"),
                Task("1.5", "Email change: wire request/confirm flow OR make email read-only in Settings", "P0"),
                Task("1.6", "Privacy policy: add encryption-at-rest mention", "P1"),
                Task("3.2", "Complete backend/.env.example with full production variable list", "P1"),
            ],
            "No marketing claim contradicts what the app actually does.",
        ),
        WeekPlan(
            f"Week 3 - Database and secrets (Phase 2 start)",
            week(3),
            "Stand up production data layer and encryption.",
            [
                Task("2.1", "Create MongoDB Atlas production cluster (UK region if claiming UK-hosted)", "P0"),
                Task("2.1", "Enable backups, IP allowlist, strong DB user; run migrate_to_atlas.py if needed", "P0"),
                Task("2.7", "Generate DOCUMENT_ENCRYPTION_KEY; set in prod env; verify new uploads encrypt", "P0"),
                Task("2.2", "Choose and provision API host (Railway, Fly, Hetzner, AWS, etc.)", "P0"),
                Task("2.2", "Install Python 3.12 + LibreOffice (soffice) on API server", "P0"),
                Task("3.6", "Prepare production env template: DEV_MODE=false, COOKIE_SECURE=true, TRUST_PROXY=true", "P0"),
            ],
            "Atlas live; encryption key set; API server provisioned (not yet public).",
        ),
        WeekPlan(
            f"Week 4 - Deploy stack (Phase 2 finish)",
            week(4),
            "Get staging/production URLs serving the app.",
            [
                Task("2.2", "Deploy backend with all env vars; confirm /api/health", "P0"),
                Task("2.3", "npm run build + deploy frontend/build to CDN or static host", "P0"),
                Task("2.4", "nginx: TLS (Let's Encrypt), /api -> :8001, / -> static, SSE proxy_buffering off", "P0"),
                Task("2.8", "UptimeRobot/Better Stack ping on /api/health every 5 min", "P1"),
                Task("2.8", "Optional: Sentry DSN on frontend + backend", "P1"),
                Task("3.4", "Optional: Docker Compose prod-like stack + README note", "P2"),
                Task("STG", "Re-run full Phase 4 smoke (4.1-4.12) on staging URL", "P0"),
            ],
            "https://staging (or prod) serves app; smoke test passes on remote env.",
        ),
        WeekPlan(
            f"Week 5 - Payments and email (Phase 2.5-2.6)",
            week(5),
            "Wire money and mail on live infrastructure.",
            [
                Task("2.5", "Stripe live keys; webhook https://yourdomain.com/api/webhook/stripe", "P0"),
                Task("2.5", "Test Pro upgrade end-to-end on live (small charge, refund)", "P0"),
                Task("4.6", "Confirm Stripe Pro checkout in smoke test (no SKIP)", "P0"),
                Task("2.6", "Resend: verify civicsign.co.uk domain (SPF, DKIM, DMARC)", "P0"),
                Task("2.6", "Send test emails: verify, invite, completion PDF attachment", "P0"),
                Task("4.11", "Contact form -> admin inbox on staging/production", "P1"),
                Task("4.12", "Password reset flow on staging (not rate-limited)", "P1"),
            ],
            "Live Stripe + Resend verified; billing and email flows proven on staging.",
        ),
        WeekPlan(
            f"Week 6 - Private beta launch (Phase 5)",
            week(6),
            "Go live with a small trusted cohort.",
            [
                Task("5.1", "Promote staging config to production URLs", "P0"),
                Task("5.2", "Point DNS: civicsign.co.uk and www", "P0"),
                Task("5.3", "Invite 5-10 pilot users (1 org + individual senders)", "P0"),
                Task("5.4", "Monitor: Sentry/errors, Resend delivery, Stripe, MongoDB connections", "P0"),
                Task("5.5", "Feedback doc; triage P0 bugs only", "P0"),
                Task("5.6", "Support channel live (e.g. info@civicbot.co.uk)", "P1"),
                Task("4.8", "Org owner adds team member; member sends doc (manual verify)", "P1"),
            ],
            "Private beta running; pilot users signing real documents.",
        ),
        WeekPlan(
            f"Week 7 - Harden for public SaaS (Phase 6 start)",
            week(7),
            "Close gaps before opening to self-serve signups.",
            [
                Task("6.1", "Ship Stripe subscriptions OR publish one-time pricing FAQ page", "P0"),
                Task("6.2", "Business plan: sales page + manual onboarding OR enable checkout", "P1"),
                Task("6.3", "Twilio SMS for Business recipient auth (if still marketed)", "P1"),
                Task("6.4", "Expand Playwright E2E: billing checkout, org portal deep path", "P1"),
                Task("CI", "Green GitHub Actions on main/overhaul branch", "P1"),
                Task("3.3", "Add Makefile install + lint targets if missing", "P2"),
            ],
            "Public launch blockers down to monitoring and load testing.",
        ),
        WeekPlan(
            f"Week 8 - Public SaaS launch (Phase 6 finish)",
            week(8),
            "Open the doors with honest positioning.",
            [
                Task("6.5", "Load test: 50 concurrent signers on one envelope", "P1"),
                Task("6.6", "Resend bounce webhook handling", "P2"),
                Task("6.7", "Optional public status page", "P2"),
                Task("6.8", "Launch blog post; update Landing metrics honestly", "P1"),
                Task("LAUNCH", "Flip from private beta to public self-serve signup", "P0"),
                Task("POST", "Archive smoke certificate + build report after prod smoke pass", "P1"),
            ],
            "Public SaaS launch complete; monitoring and support in place.",
        ),
    ]


def _completed_summary() -> list[str]:
    return [
        "Phase 4 API smoke: 18/18 passed locally (some checks SKIP when rate-limited)",
        "Playwright E2E: 5 specs (signing, org portal, contact, sealed docs, admin)",
        "GitHub Actions CI workflow added (pytest + smoke + build + E2E)",
        "Lint fixes: PdfTextEditor.jsx, usePageSeo.js",
        "Makefile: smoke, test-e2e, test-all, build-report targets",
        "Org portal polling, seal verify, smart polling fixes",
        "DEV_TEST_LOGINS.txt updated with org owner account",
        "Core product inventory complete (signing, admin, orgs, seals, billing v1)",
    ]


def _backlog_after_week8() -> list[Task]:
    return [
        Task("7.1", "Teams UI for Pro template sharing (/api/teams backend exists)"),
        Task("7.2", "v1 API: create + send envelopes programmatically"),
        Task("7.3", "Org audit log (per-org view)"),
        Task("7.4", "QES via QTSP partner"),
        Task("7.5", "SAML SSO for organisations"),
        Task("7.6", "Separate worker process for expiry_loop (multi-instance API)"),
        Task("7.7", "SOC 2 Type I planning"),
        Task("7.8", "Remove JWT from login response body"),
        Task("P2", "Stripe Customer Portal, contract version history, legacy doc migration"),
    ]


class PdfWriter:
    def __init__(self) -> None:
        import fitz

        self.fitz = fitz
        self.doc = fitz.open()
        self.page = None
        self.y = 0
        self.margin = 46
        self.page_no = 0

    def _new_page(self, header: str = "") -> None:
        self.page_no += 1
        self.page = self.doc.new_page(width=595, height=842)
        if self.page_no == 1:
            self.page.draw_rect(self.fitz.Rect(0, 0, 595, 128), color=None, fill=HEADER_BG)
            self.page.insert_text((self.margin, 58), "CivicSign", fontsize=30, fontname="hebo", color=(1, 1, 1))
            self.page.insert_text(
                (self.margin, 90),
                "Weekly Launch Roadmap - Remaining Work",
                fontsize=14,
                fontname="helv",
                color=TEAL_LIGHT,
            )
            self.y = 150
        else:
            self.y = 52
            if header:
                self.page.insert_text((self.margin, 42), _pdf_safe(header), fontsize=11, fontname="hebo", color=INK)
                self.page.draw_line(
                    self.fitz.Point(self.margin, 50),
                    self.fitz.Point(549, 50),
                    color=(0.88, 0.87, 0.82),
                    width=1,
                )
                self.y = 68

    def _space(self, n: int, header: str = "") -> None:
        if self.page is None or self.y + n > 790:
            self._new_page(header)

    def line(self, text: str, size: float = 10, bold: bool = False, color=INK) -> None:
        self._space(20)
        self.page.insert_text(
            (self.margin, self.y),
            _pdf_safe(text),
            fontsize=size,
            fontname="hebo" if bold else "helv",
            color=color,
        )
        self.y += size + 8

    def paragraph(self, text: str, size: float = 9.5) -> None:
        self._space(44)
        rect = self.fitz.Rect(self.margin, self.y - 10, 549, self.y + 70)
        self.page.insert_textbox(rect, _pdf_safe(text), fontsize=size, fontname="helv", color=INK_MUTED)
        self.y += 48

    def bullet(self, text: str, color=INK) -> None:
        self._space(18)
        self.page.insert_textbox(
            self.fitz.Rect(self.margin + 8, self.y - 10, 549, self.y + 16),
            _pdf_safe(f"- {text}"),
            fontsize=9,
            fontname="helv",
            color=color,
        )
        self.y += 16

    def save(self, pdf_path: Path) -> Path:
        pdf_path.parent.mkdir(parents=True, exist_ok=True)
        self.doc.save(pdf_path, garbage=4, deflate=True)
        png_path = pdf_path.with_suffix(".png")
        self.doc[0].get_pixmap(matrix=self.fitz.Matrix(2, 2), alpha=False).save(str(png_path))
        self.doc.close()
        return png_path


def generate(start: datetime | None = None) -> tuple[Path, Path]:
    start = start or datetime.now(timezone.utc)
    # Anchor to Monday of current week for cleaner planning
    monday = start - timedelta(days=start.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)

    git_branch = "n/a"
    try:
        git_branch = subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=ROOT, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        pass

    report_id = f"WEEKLY-{monday.strftime('%Y%m%d')}-{hashlib.sha256(git_branch.encode()).hexdigest()[:8].upper()}"
    pdf_path = ROOT / "scripts" / "reports" / f"civicsign_weekly_roadmap_{report_id}.pdf"

    w = PdfWriter()
    w._new_page()
    w.line("Plan overview", 12, bold=True)
    w.paragraph(
        f"Source: LAUNCH_ROADMAP.md. Start week: {monday.strftime('%d %b %Y')}. "
        f"Branch: {git_branch}. This plan covers ONLY leftover work - items already "
        f"completed in Phase 4 (smoke, E2E, CI) are listed under Done and skipped."
    )
    w.line("Timeline target", 11, bold=True)
    w.bullet("Weeks 1-2: Phase 0 finish + Phase 1 marketing truth + CI fixes")
    w.bullet("Weeks 3-5: Phase 2 production infrastructure + staging smoke")
    w.bullet("Week 6: Phase 5 private beta launch")
    w.bullet("Weeks 7-8: Phase 6 public SaaS launch")
    w.bullet("Months 2-6: Phase 7 enterprise backlog")

    w.line("Already done (skip)", 11, bold=True, color=SUCCESS)
    for item in _completed_summary():
        w.bullet(item, color=INK_MUTED)

    for plan in _weekly_plan(monday):
        w._space(80, plan.title)
        w.line(plan.title, 12, bold=True)
        w.line(f"Dates: {plan.dates}", 9, color=INK_MUTED)
        w.paragraph(f"Goal: {plan.goal}")
        w.line("Tasks", 10, bold=True)
        for task in plan.tasks:
            tag = f"[{task.priority}] " if task.priority else ""
            ref = f"{task.ref} " if task.ref else ""
            color = WARN if task.priority == "P0" else INK
            w.bullet(f"{ref}{tag}{task.text}", color=color)
        w.line("Exit criteria", 10, bold=True, color=SUCCESS)
        w.paragraph(plan.exit_criteria)

    w._space(80, "Post-launch backlog (Phase 7+)")
    w.line("Post-launch backlog (Phase 7+)", 12, bold=True)
    w.paragraph("Schedule after Week 8 based on customer demand.")
    for task in _backlog_after_week8():
        w.bullet(f"{task.ref} {task.text}")

    w._space(60)
    w.line("Daily rhythm (recommended)", 11, bold=True)
    w.bullet("Mon: pick 2-3 tasks from current week; block deploy-breaking P0s first")
    w.bullet("Wed: run make smoke or staging smoke; update checklist")
    w.bullet("Fri: note blockers; roll incomplete P0s into next week")

    png_path = w.save(pdf_path)

    desktop_pdf = DESKTOP / "CivicSign_Weekly_Roadmap_Leftover.pdf"
    desktop_png = DESKTOP / "CivicSign_Weekly_Roadmap_Leftover.png"
    desktop_pdf.write_bytes(pdf_path.read_bytes())
    desktop_png.write_bytes(png_path.read_bytes())
    return desktop_pdf, desktop_png


def main() -> int:
    try:
        pdf, png = generate()
    except Exception as exc:
        print(f"Weekly roadmap failed: {exc}", file=sys.stderr)
        return 1
    print("Weekly roadmap saved to Desktop:")
    print(f"  PDF: {pdf}")
    print(f"  PNG: {png}")
    return 0


if __name__ == "__main__":
    sys.exit(main())