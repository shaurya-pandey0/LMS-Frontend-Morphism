# =============================================================================
#  LifeTrack AI service — FastAPI + uvicorn (Python 3.12)
#
#  turbovec ships prebuilt wheels for common platforms only. If no wheel is
#  available the install falls back to the rest of requirements.txt and the
#  service transparently uses its NumPy vector index (VECTOR_BACKEND=auto).
# =============================================================================
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 10002 lifetrack \
    && useradd  -u 10002 -g 10002 -m -s /usr/sbin/nologin lifetrack

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip \
    && ( pip install -r requirements.txt \
         || ( echo ">> turbovec wheel unavailable, installing without it (NumPy fallback)" \
              && grep -v '^turbovec' requirements.txt > /tmp/requirements-nofast.txt \
              && pip install -r /tmp/requirements-nofast.txt ) )

COPY app ./app

# Per-user vector stores. Created with the app uid so a named volume mounted
# here inherits writable ownership.
RUN mkdir -p /app/data/users && chown -R 10002:10002 /app

USER 10002:10002

ENV VECTOR_DATA_DIR=/app/data/users \
    AI_PORT=8100

EXPOSE 8100

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS "http://127.0.0.1:${AI_PORT}/health" >/dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${AI_PORT} --workers ${AI_WORKERS:-2} --proxy-headers --forwarded-allow-ips='*'"]
