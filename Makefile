.PHONY: dev-backend dev-frontend build test-backend smoke test-e2e test-all

dev-backend:
	cd backend && .venv/bin/python -m uvicorn server:app --reload --host 127.0.0.1 --port 8001

dev-frontend:
	cd frontend && npm start

build:
	cd frontend && npm run build

test-backend:
	cd backend && .venv/bin/python -m pytest tests/ -v

smoke:
	python3 scripts/smoke_test.py

smoke-cert:
	python3 scripts/generate_smoke_certificate.py

build-report:
	python3 scripts/generate_build_report.py

weekly-roadmap:
	python3 scripts/generate_weekly_roadmap.py

test-e2e:
	npx playwright test

test-e2e-all: smoke test-e2e

test-all: test-backend smoke build