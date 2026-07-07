# CivicSign

UK e-signature platform — frontend (React) + backend (FastAPI).

**GitHub:** https://github.com/marvin2013charlie-sys/civicsign1.1.1.1  
**Deploy branch:** `civicsign-2026-overhaul` (or `main` — both track the same code)

## Local development

**Requirements:** Node.js 18+, Python 3.12+, MongoDB (local or Atlas).

### 1. Backend (port 8001)

The frontend dev proxy forwards `/api` to **port 8001**. Start the API on that port:

```bash
cd backend
python3 -m venv .venv          # first time only
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # edit MongoDB URI + secrets
uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000 — API calls go to `/api` and are proxied to http://localhost:8001.

See `frontend/.env.example` for optional env vars.

### Tests

```bash
# Backend integration tests (requires API running on :8001)
cd backend && .venv/bin/python -m pytest tests/ -v

# Frontend production build
cd frontend && npm run build
```

## Project layout

| Path | Purpose |
|------|---------|
| `frontend/src` | React app (CRA + Craco) |
| `backend/` | FastAPI API, MongoDB, PDF services |
| `backend/tests/` | Integration tests against live API |