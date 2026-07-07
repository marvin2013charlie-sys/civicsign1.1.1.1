# CivicSign backend — FastAPI on Python 3.12.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install startup-critical packages in their own layer so a stale Docker cache
# cannot ship an image missing cryptography (crashes db.py import on Render).
RUN pip install --no-cache-dir cryptography==44.0.2 httpx==0.28.1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && python -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM; import httpx; print('deps OK')"

# App code (includes assets/: email logo + PDF fonts).
COPY . .

# Verify local modules import after source is in the image.
RUN python -c "import document_crypto, integrations; print('import check OK')"

# Hosts (Render/Fly/Railway) inject $PORT; default to 8000 for local runs.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "python -c \"from cryptography.hazmat.primitives.ciphers.aead import AESGCM; import httpx\" && uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
