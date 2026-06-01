"""Phase 3 backend smoke test: templates, use, bulk send, reminder, expiry."""
import io, base64, time, requests, fitz
from PIL import Image, ImageDraw

BASE = "http://localhost:8001/api"

def pdf_bytes():
    d = fitz.open(); p = d.new_page(width=595, height=842)
    p.insert_text((72, 80), "Phase3 Template Doc", fontsize=18, fontname="hebo")
    p.insert_text((72, 700), "Sign: ______", fontsize=12, fontname="helv")
    b = d.tobytes(); d.close(); return b

def sig():
    img = Image.new("RGBA", (300, 120), (0,0,0,0)); dr = ImageDraw.Draw(img)
    dr.line([(20,90),(120,30),(200,90),(280,40)], fill=(20,30,70,255), width=4)
    bf = io.BytesIO(); img.save(bf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(bf.getvalue()).decode()

s = requests.Session()
tok = s.post(f"{BASE}/auth/login", json={"email":"demo@civicsign.com","password":"Demo1234!"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}

# 1) create a draft envelope with 1 recipient + fields
env = s.post(f"{BASE}/envelopes", headers=H, files={"file":("t.pdf", pdf_bytes(), "application/pdf")}, data={"title":"Phase3 Doc"}).json()
eid = env["envelope_id"]
rid = "rcp_t1"
s.put(f"{BASE}/envelopes/{eid}", headers=H, json={
  "signing_order":"parallel",
  "recipients":[{"recipient_id":rid,"name":"Signer Role","email":"role@example.com","order":1}],
  "fields":[{"recipient_id":rid,"page":0,"type":"signature","x":0.12,"y":0.80,"w":0.3,"h":0.06,"required":True}],
}).raise_for_status()
print("1) draft envelope ready:", eid)

# 2) Save as template
tpl = s.post(f"{BASE}/templates/from-envelope/{eid}", headers=H, json={"name":"NDA Template","description":"Single signer"}).json()
tid = tpl["template_id"]
print("2) template created:", tid, "roles:", len(tpl["roles"]), "fields:", len(tpl["fields"]))
assert len(tpl["roles"])==1 and len(tpl["fields"])==1

# 3) list templates
lst = s.get(f"{BASE}/templates", headers=H).json()
print("3) templates list count:", len(lst))
assert any(t["template_id"]==tid for t in lst)

# 4) Use template -> new draft envelope
role_id = tpl["roles"][0]["role_id"]
use = s.post(f"{BASE}/templates/{tid}/use", headers=H, json={"recipients":[{"role_id":role_id,"name":"Alice","email":"alice@example.com"}]}).json()
ueid = use["envelope_id"]
uenv = s.get(f"{BASE}/envelopes/{ueid}", headers=H).json()
print("4) used template -> envelope:", ueid, "status:", uenv["status"], "recipients:", uenv["recipients"][0]["email"], "fields:", len(uenv["fields"]))
assert uenv["status"]=="draft" and uenv["recipients"][0]["email"]=="alice@example.com" and len(uenv["fields"])==1

# 5) Send the used envelope with expiry, then reminder
send = s.post(f"{BASE}/envelopes/{ueid}/send", headers=H, json={"base_url":"http://localhost:3000","expires_in_days":7}).json()
print("5a) sent, links:", len(send["links"]))
uenv = s.get(f"{BASE}/envelopes/{ueid}", headers=H).json()
assert uenv["expires_at"], "expires_at not set"
print("5b) expires_at:", uenv["expires_at"][:19])
rem = s.post(f"{BASE}/envelopes/{ueid}/remind", headers=H, json={"base_url":"http://localhost:3000"}).json()
print("5c) reminder:", rem)
assert rem["reminded"]>=1

# 6) Bulk send
bulk = s.post(f"{BASE}/templates/{tid}/bulk-send", headers=H, json={"base_url":"http://localhost:3000","rows":[
  {"name":"Bob","email":"bob@example.com"},
  {"name":"Carol","email":"carol@example.com"},
  {"name":"Dave","email":"dave@example.com"},
]}).json()
print("6) bulk send created:", bulk["created"])
assert bulk["created"]==3

# 7) Expiry enforcement: create+send with past expiry by manipulating? Use expires_in_days then lazily can't be past.
# Instead test that a signer can sign the used envelope (parallel, recipient #1)
tok2 = send["links"][0]["token"]
sv = s.get(f"{BASE}/sign/{tok2}").json()
print("7) signer view signable:", sv["signable"], "status:", sv["status"])
assert sv["signable"]
fid = [f["field_id"] for f in sv["fields"] if f["type"]=="signature"][0]
sub = s.post(f"{BASE}/sign/{tok2}/submit", json={"consent":True,"signer_name":"Alice","values":[{"field_id":fid,"value":sig()}]}).json()
print("7b) submit:", sub)
# poll completed
for _ in range(8):
    st = s.get(f"{BASE}/envelopes/{ueid}", headers=H).json()["status"]
    if st=="completed": break
    time.sleep(1)
print("7c) used envelope final status:", st)
assert st=="completed"

print("\n=== PHASE 3 BACKEND: ALL PASSED ===")
