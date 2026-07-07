#!/usr/bin/env python3
"""Generate a CivicSign-branded PDF certificate when the Phase 4 smoke test passes."""
from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS_PATH = ROOT / "scripts" / "smoke_test_results.json"
OUT_DIR = ROOT / "scripts" / "certificates"
BASE = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")

# Match pdf_service.py / CivicSign brand tokens
INK = (0.071, 0.129, 0.125)       # #122120
INK_MUTED = (0.361, 0.420, 0.451) # #5C6B73
TEAL = (0.078, 0.722, 0.651)      # #14B8A6
TEAL_LIGHT = (0.494, 0.914, 0.867)  # icon-on-dark tone
SUCCESS = (0.086, 0.639, 0.290)   # #16A34A
HEADER_BG = (0.055, 0.169, 0.153) # auth gradient mid


def _hex_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _pdf_safe(text: str) -> str:
    """Built-in PDF fonts lack arrows and section symbols."""
    return (
        text.replace("\u2192", "->")
        .replace("\u2014", "-")
        .replace("\u00a7", "sec.")
    )


def _load_results(path: Path) -> list[dict]:
    if not path.exists():
        raise FileNotFoundError(f"Smoke results not found: {path}")
    results = json.loads(path.read_text())
    if not results:
        raise ValueError("Smoke results file is empty")
    return results


def generate_certificate(
    results: list[dict],
    *,
    environment: str = BASE,
    out_dir: Path = OUT_DIR,
) -> tuple[Path, Path]:
    failed = [r for r in results if not r.get("ok")]
    if failed:
        names = ", ".join(r["item"] for r in failed[:5])
        raise RuntimeError(f"Cannot issue certificate: {len(failed)} check(s) failed ({names})")

    import fitz  # PyMuPDF (backend venv)

    passed = len(results)
    payload = json.dumps(results, sort_keys=True, separators=(",", ":")).encode()
    results_hash = _hex_sha256(payload)
    issued_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    cert_id = f"SMOKE-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{results_hash[:8].upper()}"

    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = out_dir / f"smoke_test_certificate_{cert_id}.pdf"
    png_path = out_dir / f"smoke_test_certificate_{cert_id}.png"

    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    margin = 50

    # Header band
    page.draw_rect(fitz.Rect(0, 0, 595, 120), color=None, fill=HEADER_BG)
    page.insert_text((margin, 54), "CivicSign", fontsize=28, fontname="hebo", color=(1, 1, 1))
    page.insert_text(
        (margin, 84),
        "Phase 4 Quality Gate Certificate",
        fontsize=13,
        fontname="helv",
        color=TEAL_LIGHT,
    )

    y = 158

    def heading(text: str) -> None:
        nonlocal y
        page.insert_text((margin, y), text, fontsize=12, fontname="hebo", color=INK)
        y += 10
        page.draw_line(fitz.Point(margin, y), fitz.Point(545, y), color=(0.88, 0.87, 0.82), width=1)
        y += 22

    def line(label: str, value: str, gap: int = 24) -> None:
        nonlocal y
        page.insert_text((margin, y), label, fontsize=10, fontname="hebo", color=INK_MUTED)
        page.insert_textbox(
            fitz.Rect(margin + 155, y - 11, 545, y + 28),
            _pdf_safe(value),
            fontsize=10,
            fontname="helv",
            color=INK,
        )
        y += gap

    heading("CERTIFICATION")
    line("Certificate ID:", cert_id)
    line("Issued:", issued_at)
    line("Environment:", environment)
    line("Gate:", "Phase 4 - API Smoke Test (LAUNCH_ROADMAP 4.1-4.12)")
    line("Result:", f"PASS - {passed}/{passed} checks", gap=30)

    # Pass badge
    badge = fitz.Rect(margin, y, margin + 140, y + 36)
    page.draw_rect(badge, color=None, fill=(0.91, 0.97, 0.93), width=0)
    page.draw_rect(badge, color=SUCCESS, fill=None, width=1.5)
    page.insert_text((margin + 18, y + 24), "ALL CHECKS PASSED", fontsize=11, fontname="hebo", color=SUCCESS)
    y += 52

    line("Results Hash (SHA-256):", results_hash, gap=34)

    heading("SMOKE TEST AUDIT TRAIL")
    for item in results:
        status = "PASS" if item.get("ok") else "FAIL"
        detail = _pdf_safe((item.get("detail") or "").strip())
        row = _pdf_safe(f"{status}   |   {item.get('item', '')}")
        page.insert_textbox(
            fitz.Rect(margin, y - 10, 545, y + 16),
            row,
            fontsize=9,
            fontname="hebo" if status == "PASS" else "helv",
            color=SUCCESS if status == "PASS" else (0.86, 0.15, 0.15),
        )
        y += 16
        if detail:
            page.insert_textbox(
                fitz.Rect(margin + 14, y - 10, 545, y + 14),
                detail,
                fontsize=8,
                fontname="helv",
                color=INK_MUTED,
            )
            y += 14
        if y > 760:
            page = doc.new_page(width=595, height=842)
            y = 60

    y += 10
    footer = (
        "This certificate attests that the CivicSign Phase 4 API smoke test suite completed "
        "successfully against the target environment. It is a tamper-evident QA record: "
        "verify integrity by comparing the Results Hash (SHA-256) to a fresh hash of "
        "scripts/smoke_test_results.json."
    )
    page.insert_textbox(fitz.Rect(margin, y, 545, y + 70), footer, fontsize=8, fontname="helv", color=INK_MUTED)

    doc.save(pdf_path, garbage=4, deflate=True)
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pix.save(str(png_path))
    doc.close()
    return pdf_path, png_path


def main() -> int:
    try:
        results = _load_results(RESULTS_PATH)
        pdf_path, png_path = generate_certificate(results)
    except Exception as exc:
        print(f"Certificate generation failed: {exc}", file=sys.stderr)
        return 1

    passed = sum(1 for r in results if r.get("ok"))
    print(f"Certificate issued: {passed}/{len(results)} checks passed")
    print(f"  PDF: {pdf_path}")
    print(f"  PNG: {png_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())