alter table public.po_ingest_runs
  add column if not exists issues jsonb;
