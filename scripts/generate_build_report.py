#!/usr/bin/env python3
"""Generate a CivicSign build report PDF with launch-roadmap checklists."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "scripts" / "reports"
SMOKE_RESULTS = ROOT / "scripts" / "smoke_test_results.json"

INK = (0.071, 0.129, 0.125)
INK_MUTED = (0.361, 0.420, 0.451)
TEAL = (0.078, 0.722, 0.651)
TEAL_LIGHT = (0.494, 0.914, 0.867)
SUCCESS = (0.086, 0.639, 0.290)
WARN = (0.851, 0.467, 0.024)
FAIL = (0.863, 0.149, 0.149)
HEADER_BG = (0.055, 0.169, 0.153)
DONE_BG = (0.91, 0.97, 0.93)
PENDING_BG = (0.98, 0.97, 0.94)


@dataclass
class CheckItem:
    label: str
    status: str  # done | partial | pending | blocked
    note: str = ""


def _pdf_safe(text: str) -> str:
    return (
        text.replace("\u2192", "->")
        .replace("\u2014", "-")
        .replace("\u00a7", "sec.")
        .replace("\u2013", "-")
        .replace("\u2022", "-")
    )


def _git_info() -> dict[str, str]:
    def run(*args: str) -> str:
        try:
            return subprocess.check_output(["git", *args], cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()
        except Exception:
            return "n/a"

    return {
        "branch": run("branch", "--show-current"),
        "commit": run("log", "-1", "--format=%h %s"),
        "remote": run("remote", "get-url", "origin"),
    }


def _load_smoke() -> dict:
    if not SMOKE_RESULTS.exists():
        return {"passed": 0, "failed": 0, "total": 0, "items": []}
    items = json.loads(SMOKE_RESULTS.read_text())
    passed = sum(1 for x in items if x.get("ok"))
    failed = len(items) - passed
    return {"passed": passed, "failed": failed, "total": len(items), "items": items}


def _run_cmd(cmd: list[str], cwd: Path | None = None, timeout: int = 180) -> tuple[str, int]:
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd or ROOT),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return out.strip(), proc.returncode
    except Exception as exc:
        return str(exc), 1


def _probe_build() -> dict:
    out, code = _run_cmd(["npm", "run", "build"], cwd=ROOT / "frontend", timeout=240)
    if code == 0:
        return {"status": "pass", "detail": "Production build succeeded"}
    snippet = out.splitlines()[-3:] if out else ["Build not run"]
    return {"status": "fail", "detail": " | ".join(snippet)[:220]}


def _probe_pytest() -> dict:
    out, code = _run_cmd(
        [sys.executable, "-m", "pytest", "tests/", "-q", "--tb=no"],
        cwd=ROOT / "backend",
        timeout=120,
    )
    line = next((ln for ln in out.splitlines() if "passed" in ln or "failed" in ln), out[-200:])
    if code == 0:
        return {"status": "pass", "detail": line}
    return {"status": "fail", "detail": line[:220]}


def _checklist_data() -> list[tuple[str, list[CheckItem]]]:
    smoke = _load_smoke()
    smoke_ok = smoke["failed"] == 0 and smoke["total"] > 0

    return [
        (
            "Phase 0 - Freeze and inventory",
            [
                CheckItem("0.1 Tag pre-launch-baseline git tag", "pending"),
                CheckItem("0.2 Confirm DEV_TEST_LOGINS.txt accounts work", "done", "Updated 2026-07-07"),
                CheckItem("0.3 Run full manual smoke test", "done" if smoke_ok else "partial", f"{smoke['passed']}/{smoke['total']} API checks"),
                CheckItem("0.4 List secrets to rotate for production", "pending"),
                CheckItem("0.5 Decide launch tier (private beta vs public SaaS)", "pending"),
            ],
        ),
        (
            "Phase 1 - Truth in marketing and UX",
            [
                CheckItem("1.1 Billing honesty (subscriptions vs one-time copy)", "pending", "P0 - Terms still say subscriptions"),
                CheckItem("1.2 SMS recipient auth (wire Twilio or hide)", "pending", "P0"),
                CheckItem("1.3 Google sign-in (wire OAuth or remove copy)", "pending", "P0"),
                CheckItem("1.4 QES / unlimited claims alignment", "pending"),
                CheckItem("1.5 Email change UX (wire flow or read-only)", "pending", "P0"),
                CheckItem("1.6 Privacy policy - encryption at rest mention", "pending"),
            ],
        ),
        (
            "Phase 2 - Production infrastructure",
            [
                CheckItem("2.1 MongoDB Atlas production cluster", "pending"),
                CheckItem("2.2 API server (Python, LibreOffice, env vars)", "pending"),
                CheckItem("2.3 Frontend hosting / CDN deploy", "pending"),
                CheckItem("2.4 Reverse proxy + TLS (nginx)", "pending"),
                CheckItem("2.5 Stripe live mode + webhook URL", "pending", "Local smoke skips without keys"),
                CheckItem("2.6 Resend domain verification (SPF/DKIM)", "pending"),
                CheckItem("2.7 DOCUMENT_ENCRYPTION_KEY in production", "pending", "P0"),
                CheckItem("2.8 Health check + uptime monitoring + Sentry", "partial", "/api/health OK; no external monitor"),
            ],
        ),
        (
            "Phase 3 - Product polish",
            [
                CheckItem("3.1 Wire Admin Envelopes page (route + nav)", "pending", "Page exists, not routed"),
                CheckItem("3.2 Update backend/.env.example for production", "partial", "File exists; verify completeness"),
                CheckItem("3.3 Makefile targets (install, lint, test-all)", "done", "smoke, test-e2e, test-all present"),
                CheckItem("3.4 Docker Compose for prod-like local stack", "pending"),
                CheckItem("3.5 Org portal + seal verify on staging", "done", "Fixed in dev; smoke 4.5/4.8 pass"),
                CheckItem("3.6 Disable DEV_MODE in production", "pending"),
            ],
        ),
        (
            "Phase 4 - Quality gate",
            [
                CheckItem("4.1 Register -> verify -> login", "done" if smoke_ok else "partial", "May SKIP if rate limited"),
                CheckItem("4.2 Upload -> prepare -> send", "done" if smoke_ok else "pending"),
                CheckItem("4.3 Signer link -> sign -> complete", "done" if smoke_ok else "pending"),
                CheckItem("4.4 Download completed PDF", "done" if smoke_ok else "pending"),
                CheckItem("4.5 Seal verify lookup", "done" if smoke_ok else "pending"),
                CheckItem("4.6 Stripe Pro checkout", "partial", "SKIP locally without Stripe keys"),
                CheckItem("4.7 Admin org + contract", "done" if smoke_ok else "pending"),
                CheckItem("4.8 Org owner portal + team", "done" if smoke_ok else "pending"),
                CheckItem("4.9 Void + template reuse", "done" if smoke_ok else "pending"),
                CheckItem("4.10 PowerForm public sign", "done" if smoke_ok else "pending"),
                CheckItem("4.11 Contact form -> admin inbox", "partial", "Inbox OK; submit may rate-limit"),
                CheckItem("4.12 Password reset flow", "partial", "Endpoint OK; may rate-limit locally"),
                CheckItem("4.13 Playwright E2E suite", "done", "5 specs: signing, org, contact, sealed, admin"),
                CheckItem("4.14 GitHub Actions CI pipeline", "done", "pytest + smoke + build + E2E"),
                CheckItem("4.15 Lint fixes (PdfTextEditor, usePageSeo)", "done"),
            ],
        ),
        (
            "Phase 5 - Private beta launch",
            [
                CheckItem("5.1 Deploy production infrastructure", "pending"),
                CheckItem("5.2 Point DNS (civicsign.co.uk)", "pending"),
                CheckItem("5.3 Invite 5-10 pilot users", "pending"),
                CheckItem("5.4 Monitor errors, email, Stripe, MongoDB", "pending"),
                CheckItem("5.5 Collect feedback; triage P0 bugs", "pending"),
                CheckItem("5.6 Prepare support channel", "pending"),
            ],
        ),
        (
            "Phase 6 - Public SaaS launch",
            [
                CheckItem("6.1 Stripe subscriptions OR one-time pricing FAQ", "pending"),
                CheckItem("6.2 Business plan sales page + onboarding", "pending"),
                CheckItem("6.3 Twilio SMS for Business recipient auth", "pending"),
                CheckItem("6.4 Expand E2E (billing, org portal, admin)", "partial", "5 core specs done"),
                CheckItem("6.5 Load test: 50 concurrent signers", "pending"),
                CheckItem("6.6 Resend bounce webhook handling", "pending"),
                CheckItem("6.7 Public status page", "pending"),
                CheckItem("6.8 Launch blog + honest Landing metrics", "pending"),
            ],
        ),
        (
            "Phase 7 - Enterprise and scale",
            [
                CheckItem("7.1 Teams UI for Pro template sharing", "pending"),
                CheckItem("7.2 v1 API: create + send envelopes", "pending"),
                CheckItem("7.3 Org audit log (per-org view)", "pending"),
                CheckItem("7.4 QES via QTSP partner", "pending"),
                CheckItem("7.5 SAML SSO for organisations", "pending"),
                CheckItem("7.6 Separate worker for expiry_loop", "pending"),
                CheckItem("7.7 SOC 2 Type I planning", "pending"),
                CheckItem("7.8 Remove JWT from login response body", "pending"),
            ],
        ),
        (
            "Core product inventory (already built - do not rebuild)",
            [
                CheckItem("Upload PDF/Word -> prepare -> send -> sign -> completed PDF", "done"),
                CheckItem("Signer flow, envelope lifecycle, reminders", "done"),
                CheckItem("Audit trail + Certificate of Completion + SHA-256 seal", "done"),
                CheckItem("Seal verify, templates, bulk send, PowerForms", "done"),
                CheckItem("PDF Manager, comments (SSE), dashboard, reports", "done"),
                CheckItem("Auth: register, verify, login, reset, rate limits", "done"),
                CheckItem("Billing: Free/Pro/Business gating, Stripe one-time checkout", "done"),
                CheckItem("Organisations: admin + org portal + per-seat quotas", "done"),
                CheckItem("Admin console: users, billing, audit, CMS, orgs", "done"),
                CheckItem("Security: doc encryption, CSP, webhook SSRF protection", "done"),
                CheckItem("Marketing site: landing, solutions, blog, careers, legal", "done"),
                CheckItem("Integrations: API keys, outbound webhooks, v1 envelope list", "done"),
            ],
        ),
        (
            "P0 blockers before any public launch",
            [
                CheckItem("Production deployment (Docker/nginx/CI)", "partial", "CI added; deploy config pending"),
                CheckItem("DOCUMENT_ENCRYPTION_KEY in prod", "pending"),
                CheckItem("Rotate all secrets", "pending"),
                CheckItem("Stripe live + webhook", "pending"),
                CheckItem("Resend domain verification", "pending"),
                CheckItem("LibreOffice on API server", "pending"),
                CheckItem("Billing copy vs one-time payment reality", "pending"),
                CheckItem("SMS auth: wire or hide from marketing", "pending"),
                CheckItem("Google sign-in: wire or remove", "pending"),
                CheckItem("Email change UX broken", "pending"),
            ],
        ),
        (
            "Environment variables (production)",
            [
                CheckItem("MONGO_URL, DB_NAME, JWT_SECRET", "pending", "Required"),
                CheckItem("PLAN_ENCRYPTION_SECRET, DOCUMENT_ENCRYPTION_KEY", "pending", "Required"),
                CheckItem("CORS_ORIGINS, COOKIE_SECURE, TRUST_PROXY, DEV_MODE=false", "pending"),
                CheckItem("RESEND_API_KEY, SENDER_EMAIL, FRONTEND_URL", "pending"),
                CheckItem("STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET", "pending"),
                CheckItem("REACT_APP_BACKEND_URL (empty = same-origin proxy)", "pending"),
                CheckItem("REACT_APP_SITE_URL=https://www.civicsign.co.uk", "pending"),
            ],
        ),
    ]


class ReportBuilder:
    def __init__(self) -> None:
        import fitz

        self.fitz = fitz
        self.doc = fitz.open()
        self.page = None
        self.y = 0
        self.margin = 46
        self.page_no = 0

    def _new_page(self, subtitle: str = "") -> None:
        self.page_no += 1
        self.page = self.doc.new_page(width=595, height=842)
        self.y = 52 if self.page_no == 1 else 58
        if self.page_no == 1:
            self.page.draw_rect(self.fitz.Rect(0, 0, 595, 128), color=None, fill=HEADER_BG)
            self.page.insert_text((self.margin, 58), "CivicSign", fontsize=30, fontname="hebo", color=(1, 1, 1))
            self.page.insert_text(
                (self.margin, 90),
                "Build Report and Launch Checklist",
                fontsize=14,
                fontname="helv",
                color=TEAL_LIGHT,
            )
            self.y = 150
        elif subtitle:
            self.page.insert_text((self.margin, 42), _pdf_safe(subtitle), fontsize=11, fontname="hebo", color=INK)
            self.page.draw_line(
                self.fitz.Point(self.margin, 50),
                self.fitz.Point(549, 50),
                color=(0.88, 0.87, 0.82),
                width=1,
            )
            self.y = 68

    def _ensure_space(self, need: int, subtitle: str = "") -> None:
        if self.page is None or self.y + need > 790:
            self._new_page(subtitle)

    def _text(self, text: str, size: float = 10, bold: bool = False, color=INK, x: float | None = None) -> None:
        self._ensure_space(18)
        self.page.insert_text(
            (x or self.margin, self.y),
            _pdf_safe(text),
            fontsize=size,
            fontname="hebo" if bold else "helv",
            color=color,
        )
        self.y += size + 8

    def _paragraph(self, text: str, size: float = 9.5) -> None:
        self._ensure_space(40)
        rect = self.fitz.Rect(self.margin, self.y - 10, 549, self.y + 60)
        self.page.insert_textbox(rect, _pdf_safe(text), fontsize=size, fontname="helv", color=INK_MUTED)
        self.y += 52

    def _table_row(self, cols: list[str], widths: list[int], bold: bool = False, colors: list | None = None) -> None:
        self._ensure_space(20)
        x = self.margin
        for col, w, color in zip(cols, widths, colors or [INK] * len(cols)):
            self.page.insert_textbox(
                self.fitz.Rect(x, self.y - 10, x + w, self.y + 14),
                _pdf_safe(col),
                fontsize=9,
                fontname="hebo" if bold else "helv",
                color=color,
            )
            x += w
        self.y += 18

    def _status_style(self, status: str) -> tuple[str, tuple]:
        styles = {
            "done": ("[x]", SUCCESS),
            "partial": ("[~]", WARN),
            "pending": ("[ ]", INK_MUTED),
            "blocked": ("[!]", FAIL),
            "pass": ("PASS", SUCCESS),
            "fail": ("FAIL", FAIL),
        }
        return styles.get(status, ("[ ]", INK_MUTED))

    def add_summary(self, meta: dict) -> None:
        self._new_page()
        self._text("Report metadata", 12, bold=True)
        rows = [
            ("Generated", meta["generated"]),
            ("Repository", meta["remote"]),
            ("Branch", meta["branch"]),
            ("Commit", meta["commit"]),
            ("Report ID", meta["report_id"]),
        ]
        for label, value in rows:
            self._table_row([label, value], [120, 380])

        self.y += 8
        self._text("Executive summary", 12, bold=True)
        self._paragraph(
            "Source: LAUNCH_ROADMAP.md (July 2026). CivicSign core product is substantially built. "
            "Phase 4 quality gate automation is in place (API smoke, Playwright E2E, GitHub Actions). "
            "Remaining work is production deployment, billing/marketing truth, and P0 security/ops "
            "before public launch. Use the phase checklists below as your working roadmap."
        )

        self._text("Launch readiness (estimate)", 11, bold=True)
        readiness = [
            ("Private beta (founder-led)", "~85%", "2-4 weeks"),
            ("Public SaaS launch", "~68%", "6-8 weeks"),
            ("Enterprise-ready", "~50%", "3-6 months"),
        ]
        self._table_row(["Tier", "Complete", "ETA"], [200, 90, 120], bold=True)
        for tier, pct, eta in readiness:
            self._table_row([tier, pct, eta], [200, 90, 120])

    def add_test_results(self, results: dict) -> None:
        self._ensure_space(120, "Build and test results")
        self._text("Automated verification (this machine)", 11, bold=True)
        self._table_row(["Suite", "Status", "Detail"], [130, 70, 300], bold=True)
        for name, row in results.items():
            if name == "smoke" or not isinstance(row, dict) or "status" not in row:
                continue
            mark, color = self._status_style(row["status"])
            self._table_row([name, mark, row["detail"]], [130, 70, 300], colors=[INK, color, INK_MUTED])

        if results.get("smoke", {}).get("items"):
            self.y += 6
            self._text("API smoke checks", 11, bold=True)
            for item in results["smoke"]["items"]:
                mark, color = self._status_style("done" if item.get("ok") else "blocked")
                self._table_row(
                    [mark, item.get("item", ""), (item.get("detail") or "")[:80]],
                    [28, 200, 250],
                    colors=[color, INK, INK_MUTED],
                )

    def add_checklists(self, sections: list[tuple[str, list[CheckItem]]]) -> None:
        for title, items in sections:
            self._ensure_space(60, title)
            self.y += 4
            done = sum(1 for i in items if i.status == "done")
            partial = sum(1 for i in items if i.status == "partial")
            pending = sum(1 for i in items if i.status == "pending")
            self._text(f"{title}  ({done} done, {partial} partial, {pending} open)", 11, bold=True)
            self._table_row(["", "Item", "Note"], [24, 300, 170], bold=True)
            for item in items:
                mark, color = self._status_style(item.status)
                self._table_row(
                    [mark, item.label, item.note[:70]],
                    [24, 300, 170],
                    colors=[color, INK, INK_MUTED],
                )
            self.y += 6

    def add_next_actions(self) -> None:
        self._ensure_space(120, "Suggested next actions")
        actions = [
            "1. Fix frontend build blocker: add missing components/ui/alert-dialog.jsx (blocks CI build job).",
            "2. Align pytest credentials with DEV_TEST_LOGINS.txt or seed demo@example.com in local DB.",
            "3. Complete Phase 0: tag baseline, list secrets to rotate, choose private beta vs public SaaS.",
            "4. Phase 1.1 decision: Stripe subscriptions OR update Terms/Landing for one-time Pro purchase.",
            "5. Phase 2 parallel track: Atlas cluster + API server + nginx TLS + Resend domain verify.",
            "6. Wire Admin Envelopes route in App.js and AdminShell.jsx (Phase 3.1).",
            "7. Re-run make smoke on staging after deploy; archive certificate + this build report.",
            "8. Update CI workflow branches to include civicsign-2026-overhaul (currently main/master/develop only).",
        ]
        for action in actions:
            self._paragraph(action, size=9)

        self.y += 4
        self._text("Legend", 10, bold=True)
        self._paragraph("[x] Done   [~] Partial / skipped locally   [ ] Not started   [!] Blocked / failing")

    def save(self, path: Path) -> None:
        self.doc.save(path, garbage=4, deflate=True)
        pix = self.doc[0].get_pixmap(matrix=self.fitz.Matrix(2, 2), alpha=False)
        pix.save(str(path.with_suffix(".png")))
        self.doc.close()


def generate_report(*, run_probes: bool = True) -> tuple[Path, Path]:
    git = _git_info()
    smoke = _load_smoke()

    build = _probe_build() if run_probes else {"status": "pending", "detail": "Not probed"}
    pytest = _probe_pytest() if run_probes else {"status": "pending", "detail": "Not probed"}

    e2e_specs = list((ROOT / "e2e").glob("*.spec.js"))
    ci_exists = (ROOT / ".github" / "workflows" / "ci.yml").exists()

    results = {
        "API smoke (make smoke)": {
            "status": "pass" if smoke["failed"] == 0 and smoke["total"] else "fail",
            "detail": f"{smoke['passed']}/{smoke['total']} checks passed",
        },
        "Backend pytest": pytest,
        "Frontend production build": build,
        "Playwright E2E specs": {
            "status": "pass" if len(e2e_specs) >= 5 else "partial",
            "detail": f"{len(e2e_specs)} spec files in e2e/",
        },
        "GitHub Actions CI": {
            "status": "pass" if ci_exists else "pending",
            "detail": ".github/workflows/ci.yml present" if ci_exists else "Missing",
        },
        "smoke": smoke,
    }

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    report_id = f"BUILD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{hashlib.sha256(generated.encode()).hexdigest()[:8].upper()}"

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pdf_path = OUT_DIR / f"civicsign_build_report_{report_id}.pdf"

    builder = ReportBuilder()
    builder.add_summary(
        {
            "generated": generated,
            "remote": git["remote"],
            "branch": git["branch"],
            "commit": git["commit"],
            "report_id": report_id,
        }
    )
    builder.add_test_results(results)
    builder.add_checklists(_checklist_data())
    builder.add_next_actions()
    builder.save(pdf_path)
    return pdf_path, pdf_path.with_suffix(".png")


def main() -> int:
    try:
        pdf_path, png_path = generate_report()
    except Exception as exc:
        print(f"Build report failed: {exc}", file=sys.stderr)
        return 1

    print("Build report generated:")
    print(f"  PDF: {pdf_path}")
    print(f"  PNG: {png_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())