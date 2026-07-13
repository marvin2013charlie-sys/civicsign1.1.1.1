#!/usr/bin/env python3
"""Generate CivicSign Launch Roadmap PDF (HTML → PDF via Playwright)."""
from __future__ import annotations

from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs"
HTML_PATH = OUT_DIR / "CivicSign-Launch-Roadmap.html"
PDF_PATH = OUT_DIR / "CivicSign-Launch-Roadmap.pdf"
DESKTOP_PDF = Path.home() / "Desktop" / "CivicSign-Launch-Roadmap.pdf"

TODAY = date(2026, 7, 13)


def build_html() -> str:
    beta_start = date(2026, 7, 14)
    beta_end = date(2026, 7, 25)
    soft_launch = date(2026, 8, 8)
    public_launch = date(2026, 8, 22)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>CivicSign Launch Roadmap</title>
  <style>
    @page {{ size: A4; margin: 18mm 16mm 20mm 16mm; }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #122120; font-size: 10.5pt; line-height: 1.55; margin: 0;
    }}
    h1 {{ font-size: 26pt; margin: 0 0 6px; letter-spacing: -0.02em; }}
    h2 {{ font-size: 14pt; margin: 22px 0 8px; color: #0D9488; border-bottom: 2px solid #E1DDD1; padding-bottom: 4px; page-break-after: avoid; }}
    h3 {{ font-size: 11pt; margin: 14px 0 6px; color: #122120; page-break-after: avoid; }}
    p {{ margin: 0 0 8px; }}
    .meta {{ color: #5C6B73; font-size: 9.5pt; margin-bottom: 18px; }}
    .hero-box {{
      background: linear-gradient(135deg, #F8F7F2 0%, #E4F6F2 100%);
      border: 1px solid #E1DDD1; border-radius: 12px; padding: 16px 18px; margin: 16px 0 20px;
    }}
    .hero-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; }}
    .stat {{ background: #fff; border: 1px solid #E1DDD1; border-radius: 10px; padding: 10px; text-align: center; }}
    .stat strong {{ display: block; font-size: 18pt; color: #0D9488; }}
    .stat span {{ font-size: 8.5pt; color: #5C6B73; }}
    table {{ width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 9.5pt; }}
    th, td {{ border: 1px solid #E1DDD1; padding: 7px 8px; vertical-align: top; text-align: left; }}
    th {{ background: #F0EEE6; font-weight: 600; }}
    .tag {{ display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 8pt; font-weight: 600; }}
    .done {{ background: #EAF7EE; color: #166534; }}
    .next {{ background: #E4F6F2; color: #0F766E; }}
    .risk {{ background: #FEF3C7; color: #92400E; }}
    .later {{ background: #F0EEE6; color: #1B2E2C; }}
    ul {{ margin: 4px 0 10px 18px; padding: 0; }}
    li {{ margin-bottom: 4px; }}
    .timeline {{ border-left: 3px solid #14B8A6; padding-left: 14px; margin: 10px 0 16px; }}
    .phase {{ margin-bottom: 12px; page-break-inside: avoid; }}
    .footer {{ margin-top: 24px; padding-top: 10px; border-top: 1px solid #E1DDD1; font-size: 8.5pt; color: #5C6B73; }}
    .page-break {{ page-break-before: always; }}
    code {{ background: #F0EEE6; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }}
  </style>
</head>
<body>

<h1>CivicSign Launch Roadmap</h1>
<p class="meta">Prepared {TODAY.strftime("%d %B %Y")} · CivicBot LTD · UK e-signatures + Manage PDF</p>

<div class="hero-box">
  <p><strong>Executive summary:</strong> The product is <strong>feature-complete for private beta</strong>. You are approximately
  <strong>2–3 weeks from private beta</strong> and <strong>5–6 weeks from public launch</strong>, assuming focused execution on deploy,
  secrets, Stripe, and pilot onboarding.</p>
  <div class="hero-grid">
    <div class="stat"><strong>~12 days</strong><span>Private beta ready</span></div>
    <div class="stat"><strong>~26 days</strong><span>Soft public launch</span></div>
    <div class="stat"><strong>~40 days</strong><span>Full public launch</span></div>
    <div class="stat"><strong>93/93</strong><span>Backend tests pass</span></div>
  </div>
</div>

<h2>1. Where you are today (13 July 2026)</h2>
<table>
  <tr><th>Area</th><th>Status</th><th>Evidence</th></tr>
  <tr><td>Core signing flow</td><td><span class="tag done">Ready</span></td><td>Register → upload → send → sign → complete E2E passes</td></tr>
  <tr><td>Manage PDF (10 tools)</td><td><span class="tag done">Ready</span></td><td>Compress, watermark, protect, unlock, merge, split, convert E2E</td></tr>
  <tr><td>Marketing site</td><td><span class="tag done">Ready</span></td><td>Landing, Pricing, Manage PDF product page, solutions, blog</td></tr>
  <tr><td>Legal pages</td><td><span class="tag done">Ready</span></td><td>Privacy, Terms, Cookies, Refunds — redesigned Jul 2026</td></tr>
  <tr><td>Mobile UX</td><td><span class="tag done">Ready</span></td><td>Header, legal, auth, marketing pages optimised for mobile</td></tr>
  <tr><td>Security &amp; privacy</td><td><span class="tag done">Ready</span></td><td>Document encryption, staff cannot read PDFs, impersonation OTP</td></tr>
  <tr><td>Org portal</td><td><span class="tag done">Ready</span></td><td>Owner portal, team, contract tabs E2E</td></tr>
  <tr><td>Admin console</td><td><span class="tag done">Ready</span></td><td>Users, orgs, billing, audit, impersonation (consent-gated)</td></tr>
  <tr><td>Backend API tests</td><td><span class="tag done">Ready</span></td><td>93 passed, 1 skipped (live API integration)</td></tr>
  <tr><td>Playwright E2E</td><td><span class="tag done">Ready</span></td><td>12/12 specs pass locally</td></tr>
  <tr><td>Smoke test</td><td><span class="tag risk">18/19</span></td><td>Seal verify lookup fails after fresh DB reset (data-dependent)</td></tr>
  <tr><td>Production deploy</td><td><span class="tag next">Pending</span></td><td>render.yaml ready; api.civicsign.co.uk not yet wired</td></tr>
  <tr><td>Stripe live billing</td><td><span class="tag next">Pending</span></td><td>Checkout works with test keys; live keys not configured</td></tr>
  <tr><td>Secrets rotation</td><td><span class="tag risk">Required</span></td><td>Atlas, JWT, Resend keys should be rotated before prod</td></tr>
</table>

<h2>2. Launch timeline (recommended)</h2>
<div class="timeline">
  <div class="phase"><strong>Phase 0 — Today → {beta_start.strftime("%d %b")}</strong> (1 day)<br/>
  Freeze scope, tag release branch, run full test suite, export this roadmap.</div>
  <div class="phase"><strong>Phase 1 — Pre-launch hardening</strong> ({beta_start.strftime("%d %b")} → {date(2026,7,18).strftime("%d %b")}) — <em>4 working days</em><br/>
  Rotate secrets, set DOCUMENT_ENCRYPTION_KEY, deploy API to Render, wire api.civicsign.co.uk, redeploy frontend with REACT_APP_BACKEND_URL.</div>
  <div class="phase"><strong>Phase 2 — Private beta</strong> ({date(2026,7,19).strftime("%d %b")} → {beta_end.strftime("%d %b")}) — <em>1 week</em><br/>
  Onboard 5–10 pilot users (solicitors, agencies, freelancers). Founder-led support via info@civicbot.co.uk. Monitor health + errors daily.</div>
  <div class="phase"><strong>Phase 3 — Billing go-live</strong> ({date(2026,7,21).strftime("%d %b")} → {soft_launch.strftime("%d %b")}) — <em>2.5 weeks</em><br/>
  Stripe live keys, webhook on production URL, test Pro/Business checkout, refund policy in practice.</div>
  <div class="phase"><strong>Phase 4 — Soft public launch</strong> ({soft_launch.strftime("%d %b")}) — <em>target date</em><br/>
  Remove private-beta banner, open self-serve registration, announce on LinkedIn / email list.</div>
  <div class="phase"><strong>Phase 5 — Full public launch</strong> ({public_launch.strftime("%d %b")}) — <em>target date</em><br/>
  Press/outreach, comparison content, SEO index, optional paid ads. SMS auth &amp; Google OAuth remain post-launch.</div>
</div>

<h2>3. Phase 1 — Pre-launch hardening (detailed checklist)</h2>
<h3>Day 1 — Secrets &amp; keys (2–3 hours)</h3>
<ul>
  <li>Rotate MongoDB Atlas user password → update <code>MONGO_URL</code> in Render</li>
  <li>Generate new <code>JWT_SECRET</code>, <code>PLAN_ENCRYPTION_SECRET</code>, <code>DOCUMENT_ENCRYPTION_KEY</code> (32-byte base64)</li>
  <li>Rotate Resend API key; verify <code>SENDER_EMAIL=noreply@civicsign.co.uk</code></li>
  <li>Never run <code>scripts/reset_dev_data.py</code> against production Atlas</li>
</ul>
<h3>Day 2 — Backend deploy (half day)</h3>
<ul>
  <li>Push <code>civicsign-2026-overhaul</code> branch to GitHub</li>
  <li>Render Dashboard → New → Blueprint → select repo (reads <code>render.yaml</code>)</li>
  <li>Set all <code>sync: false</code> env vars in Render dashboard</li>
  <li>Confirm <code>https://&lt;render-url&gt;/api/health</code> returns 200</li>
  <li>Add custom domain <code>api.civicsign.co.uk</code> (CNAME in Cloudflare, grey cloud initially)</li>
</ul>
<h3>Day 3 — Frontend deploy (2 hours)</h3>
<ul>
  <li>Cloudflare Pages: <code>REACT_APP_BACKEND_URL=https://api.civicsign.co.uk</code></li>
  <li>Optional beta flag: <code>REACT_APP_PRIVATE_BETA=true</code></li>
  <li>Trigger frontend rebuild + purge Cloudflare cache</li>
  <li>Verify login, register, dashboard, manage-pdf on production URL</li>
</ul>
<h3>Day 4 — Verification (2 hours)</h3>
<ul>
  <li>Run <code>REACT_APP_BACKEND_URL=https://api.civicsign.co.uk python3 scripts/smoke_test.py</code></li>
  <li>Manual: register → verify email → upload PDF → send → sign → download → seal verify</li>
  <li>Set up UptimeRobot on <code>/api/health</code> (5-min interval, free tier)</li>
  <li>Lock Atlas Network Access to Render outbound IPs</li>
</ul>

<div class="page-break"></div>

<h2>4. Phase 2 — Private beta (5–10 pilots)</h2>
<table>
  <tr><th>Task</th><th>Owner</th><th>Duration</th></tr>
  <tr><td>Identify 5–10 pilot organisations (legal, HR, property, freelancers)</td><td>Founder</td><td>2 days</td></tr>
  <tr><td>Send onboarding email with register link + support contact</td><td>Founder</td><td>1 day</td></tr>
  <tr><td>Create org accounts in admin for enterprise-style pilots (optional)</td><td>Founder</td><td>As needed</td></tr>
  <tr><td>Daily inbox check + 24h response SLA</td><td>Founder</td><td>Ongoing</td></tr>
  <tr><td>Collect feedback: signing UX, PDF tools, pricing, mobile</td><td>Founder</td><td>Weekly call</td></tr>
  <tr><td>Fix P0 bugs from pilots within 48h</td><td>Dev</td><td>Ongoing</td></tr>
  <tr><td>Track metrics: signups, envelopes sent, completion rate, churn signals</td><td>Founder</td><td>Weekly</td></tr>
</table>
<p><strong>Beta success criteria:</strong> 3+ pilots complete a full signing cycle without founder intervention; zero data-loss incidents; &lt;2 P0 bugs open at end of beta.</p>

<h2>5. Phase 3 — Stripe billing go-live</h2>
<ul>
  <li>Create Stripe live mode products for Pro (£15/mo) and Business (£79/mo) — prices excl. VAT</li>
  <li>Set <code>STRIPE_API_KEY</code> and <code>STRIPE_WEBHOOK_SECRET</code> in Render</li>
  <li>Webhook endpoint: <code>https://api.civicsign.co.uk/api/webhook/stripe</code></li>
  <li>Test: Free user upgrades to Pro → payment → plan updates → quota increases</li>
  <li>Test: Pay-as-you-go extra document purchase (80p excl. VAT)</li>
  <li>Document refund process per <code>/legal/refunds</code> policy</li>
</ul>

<h2>6. Phase 4 — Soft public launch ({soft_launch.strftime("%d %B %Y")} target)</h2>
<ul>
  <li>Remove <code>REACT_APP_PRIVATE_BETA</code> banner from frontend build</li>
  <li>Publish blog post: "CivicSign is live — UK-built e-signatures"</li>
  <li>Update sitemap; submit to Google Search Console</li>
  <li>LinkedIn announcement + email to waitlist</li>
  <li>Monitor signup funnel, error rates, and support volume for 7 days</li>
</ul>

<h2>7. Phase 5 — Full public launch ({public_launch.strftime("%d %B %Y")} target)</h2>
<ul>
  <li>Industry landing pages SEO pass (solutions/*)</li>
  <li>Case study from best beta pilot</li>
  <li>Optional: Product Hunt, legal tech directories, ICAEW/Law Society outreach</li>
  <li>Consider SOC2 / Cyber Essentials roadmap (Q4 2026) for enterprise sales</li>
</ul>

<h2>8. Post-launch backlog (defer until after launch)</h2>
<table>
  <tr><th>Feature</th><th>Priority</th><th>Notes</th></tr>
  <tr><td>SMS signer authentication</td><td><span class="tag later">P2</span></td><td>Not required for UK solicitor workflows initially</td></tr>
  <tr><td>Google OAuth sign-in</td><td><span class="tag later">P2</span></td><td>Email/password works; add when demand confirmed</td></tr>
  <tr><td>Cookie-only auth (remove JWT from login JSON)</td><td><span class="tag later">P2</span></td><td>Security hardening per SECURITY-NOTES.md</td></tr>
  <tr><td>Bundle size / code splitting</td><td><span class="tag later">P3</span></td><td>710KB gzip main bundle — optimise after launch</td></tr>
  <tr><td>Legacy PDF encryption migration</td><td><span class="tag later">P3</span></td><td>Re-upload old GridFS docs if any exist in prod</td></tr>
</table>

<h2>9. Risk register</h2>
<table>
  <tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr>
  <tr><td>Secrets exposed in dev transcripts</td><td>High</td><td>Rotate all keys before prod deploy (Phase 1 Day 1)</td></tr>
  <tr><td>Render cold start on free tier</td><td>High</td><td>Use starter plan ($7/mo) — already in render.yaml</td></tr>
  <tr><td>Stripe webhook failures</td><td>Medium</td><td>Test webhook in staging; monitor Stripe dashboard</td></tr>
  <tr><td>Email deliverability</td><td>Medium</td><td>Resend domain verified; SPF/DKIM on civicsign.co.uk</td></tr>
  <tr><td>Founder support overload</td><td>Medium</td><td>Cap beta at 10 users; template FAQ responses</td></tr>
  <tr><td>Legal/regulatory challenge</td><td>Low</td><td>UK eIDAS aligned; audit trail + Certificate of Completion</td></tr>
</table>

<h2>10. Weekly work plan (next 4 weeks)</h2>
<table>
  <tr><th>Week</th><th>Dates</th><th>Focus</th><th>Deliverable</th></tr>
  <tr><td>Week 1</td><td>14–18 Jul</td><td>Deploy + verify</td><td>api.civicsign.co.uk live, smoke test on prod</td></tr>
  <tr><td>Week 2</td><td>21–25 Jul</td><td>Private beta</td><td>5 pilots onboarded, feedback doc</td></tr>
  <tr><td>Week 3</td><td>28 Jul – 1 Aug</td><td>Beta fixes + Stripe</td><td>Live billing, beta bugs closed</td></tr>
  <tr><td>Week 4</td><td>4–8 Aug</td><td>Soft launch prep</td><td>Marketing assets, launch checklist signed off</td></tr>
</table>

<h2>11. Key commands &amp; paths</h2>
<ul>
  <li>Local dev: <code>make dev-all</code> → http://localhost:3000</li>
  <li>Full test: <code>make test-all</code> + <code>make test-e2e</code></li>
  <li>Prod smoke: <code>REACT_APP_BACKEND_URL=https://api.civicsign.co.uk python3 scripts/smoke_test.py</code></li>
  <li>Deploy guide: <code>DEPLOYMENT.md</code></li>
  <li>Security audit: <code>SECURITY-NOTES.md</code></li>
  <li>GitHub: marvin2013charlie-sys/civicsign1.1.1.1 (branch: civicsign-2026-overhaul)</li>
</ul>

<div class="footer">
  CivicSign Launch Roadmap · Generated {TODAY.strftime("%d %B %Y")} · Confidential — CivicBot LTD ·
  For questions: info@civicbot.co.uk · This document is a working plan, not legal advice.
</div>

</body>
</html>"""


def main() -> int:
    import shutil
    import sys

    html = build_html()
    if "--html-only" in sys.argv:
        sys.stdout.write(html)
        return 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    HTML_PATH.write_text(html, encoding="utf-8")
    # PDF generation via Node Playwright (see generate_launch_roadmap.mjs)
    import subprocess

    mjs = ROOT / "scripts" / "generate_launch_roadmap.mjs"
    if mjs.exists():
        # Avoid recursion: mjs calls us with --html-only
        result = subprocess.run(["node", str(mjs)], cwd=ROOT, check=False)
        return result.returncode

    print(f"HTML: {HTML_PATH}")
    print("Run: node scripts/generate_launch_roadmap.mjs")
    shutil.copy2(HTML_PATH, DESKTOP_PDF.with_suffix(".html"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())