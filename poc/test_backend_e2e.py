"""Quick end-to-end backend smoke test against localhost:8001 (Bearer auth)."""
import io
import base64
import requests
import fitz
from PIL import Image, ImageDraw

BASE = "http://localhost:8001/api"


def make_pdf_bytes():
    doc = fitz.open()
    p = doc.new_page(width=595, height=842)
    p.insert_text((72, 80), "CIVICSIGN E2E Test Agreement", fontsize=18, fontname="hebo")
    p.insert_text((72, 700), "Signature: __________________", fontsize=12, fontname="helv")
    data = doc.tobytes()
    doc.close()
    return data


def make_sig_dataurl():
    img = Image.new("RGBA", (400, 140), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.line([(20, 100), (120, 40), (200, 100), (300, 50), (380, 90)], fill=(20, 30, 70, 255), width=4)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


s = requests.Session()
print("1) login")
r = s.post(f"{BASE}/auth/login", json={"email": "demo@civicsign.com", "password": "Demo1234!"})
r.raise_for_status()
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}
print("   ok, user:", r.json()["user"]["email"])

print("2) /auth/me")
r = s.get(f"{BASE}/auth/me", headers=H); r.raise_for_status()
print("   ok:", r.json()["email"])

print("3) create envelope (upload PDF)")
files = {"file": ("test.pdf", make_pdf_bytes(), "application/pdf")}
r = s.post(f"{BASE}/envelopes", headers=H, files=files, data={"title": "E2E Agreement"})
r.raise_for_status()
env = r.json()
eid = env["envelope_id"]
print("   ok env:", eid, "pages:", env["document"]["page_count"])

print("4) update recipients + fields")
rid = "rcp_e2e_1"
payload = {
    "signing_order": "parallel",
    "recipients": [{"recipient_id": rid, "name": "Alex Signer", "email": "alex@example.com", "order": 1}],
    "fields": [
        {"recipient_id": rid, "page": 0, "type": "signature", "x": 0.12, "y": 0.80, "w": 0.30, "h": 0.06, "required": True},
        {"recipient_id": rid, "page": 0, "type": "date", "x": 0.55, "y": 0.80, "w": 0.25, "h": 0.03, "required": True},
    ],
}
r = s.put(f"{BASE}/envelopes/{eid}", headers=H, json=payload); r.raise_for_status()
env = r.json()
fids = [f["field_id"] for f in env["fields"]]
print("   ok fields:", len(env["fields"]), "recipients:", len(env["recipients"]))

print("5) send")
r = s.post(f"{BASE}/envelopes/{eid}/send", headers=H, json={"base_url": "http://localhost:3000"})
r.raise_for_status()
links = r.json()["links"]
sign_token = links[0]["token"]
print("   ok sent, token:", sign_token[:10], "...")

print("6) signer view")
r = s.get(f"{BASE}/sign/{sign_token}"); r.raise_for_status()
sv = r.json()
print("   ok signable:", sv["signable"], "fields:", len(sv["fields"]), "status:", sv["status"])

print("7) signer file (pdf)")
r = s.get(f"{BASE}/sign/{sign_token}/file"); r.raise_for_status()
print("   ok pdf bytes:", len(r.content), "ct:", r.headers.get("content-type"))

print("8) submit signature")
sig = make_sig_dataurl()
vals = []
for f in sv["fields"]:
    if f["type"] == "signature":
        vals.append({"field_id": f["field_id"], "value": sig})
    elif f["type"] == "date":
        vals.append({"field_id": f["field_id"], "value": "2026-06-01"})
r = s.post(f"{BASE}/sign/{sign_token}/submit",
           json={"consent": True, "signer_name": "Alex Signer", "values": vals})
r.raise_for_status()
print("   ok submit:", r.json())

print("9) poll envelope -> completed")
import time
status = None
for _ in range(10):
    r = s.get(f"{BASE}/envelopes/{eid}", headers=H); r.raise_for_status()
    status = r.json()["status"]
    if status == "completed":
        break
    time.sleep(1)
print("   status:", status, "hash:", (r.json().get("doc_hash") or "")[:16])
assert status == "completed", "Envelope did not complete!"

print("10) download completed PDF")
r = s.get(f"{BASE}/envelopes/{eid}/completed", headers=H); r.raise_for_status()
out = r.content
with open("/app/poc/out/e2e_completed.pdf", "wb") as fh:
    fh.write(out)
d = fitz.open(stream=out, filetype="pdf")
print("   ok completed pdf pages:", len(d), "(content + certificate)")
d.close()

print("\n=== BACKEND E2E: ALL STEPS PASSED ===")
