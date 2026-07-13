.PHONY: dev-backend dev-frontend dev-all dev-stop dev-status build test-backend smoke test-e2e test-all

dev-all:
	bash scripts/dev-all.sh

dev-stop:
	bash scripts/dev-stop.sh

dev-status:
	bash scripts/dev-status.sh

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

verify-integrations:
	python3 scripts/verify_integrations.py

test-e2e:
	npx playwright test

mobile-preview:
	MOBILE_LAN_IP=$$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "") node scripts/mobile-preview.mjs

launch-roadmap:
	node scripts/generate_launch_roadmap.mjs

test-all: test-backend smoke build