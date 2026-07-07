#!/usr/bin/env python3
import sys
from pathlib import Path
import fitz

out = Path(__file__).parent / "assets" / "employment-contract.pdf"
out.parent.mkdir(parents=True, exist_ok=True)
doc = fitz.open()
p = doc.new_page(width=595, height=842)
p.insert_text((72, 72), "Employment Contract", fontsize=22, fontname="hebo", color=(0.06, 0.09, 0.16))
lines = [
    "This agreement is between Northwind Studio Ltd and the employee named below.",
    "1. Role: Senior Operations Manager",
    "2. Start date: 1 August 2026",
    "3. Salary: as agreed in schedule A",
    "4. Confidentiality and IP assignment apply from day one.",
    "Please sign below to accept these terms.",
]
y = 130
for line in lines:
    p.insert_text((72, y), line, fontsize=12, fontname="helv", color=(0.15, 0.18, 0.22))
    y += 28
p.draw_rect(fitz.Rect(72, 700, 320, 760), color=(0.06, 0.40, 0.36), width=1.2)
p.insert_text((78, 728), "Employee signature", fontsize=11, fontname="helv", color=(0.35, 0.40, 0.45))
doc.save(str(out))
doc.close()
print(out)