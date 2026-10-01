FROM node:22-bookworm AS next-build

WORKDIR /app/kanbons
COPY kanbons/package.json kanbons/package-lock.json ./
RUN npm ci
COPY kanbons/ ./
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

COPY PO-ingestion /app/PO-ingestion
RUN python3 -m venv /app/.venv \
  && /app/.venv/bin/pip install --upgrade pip \
  && /app/.venv/bin/pip install "psycopg[binary]" pydantic docling

ENV HF_HOME=/app/.cache/huggingface
ENV KANBONS_ROOT=/app
ENV KANBONS_PYTHON=/app/.venv/bin/python
WORKDIR /app/PO-ingestion
RUN /app/.venv/bin/python -c "from ocr import make_converter; make_converter()"

COPY --from=next-build /app/kanbons /app/kanbons
WORKDIR /app/kanbons
ENV NODE_ENV=production
EXPOSE 3000
CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
