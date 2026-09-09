create table public.po_ingest_runs (
  id bigint generated always as identity primary key,
  source_filename text not null,
  source_path text not null,
  extracted_json jsonb,
  resolved_json jsonb,
  status text not null
    check (status in ('failed', 'unmatched', 'saved')),
  failure_reason text,
  packing_list_id bigint references public.packing_lists (id),
  gold_json jsonb,
  created_at timestamptz not null default now()
);

create index po_ingest_runs_status_idx on public.po_ingest_runs (status);
create index po_ingest_runs_packing_list_id_idx on public.po_ingest_runs (packing_list_id);
create index po_ingest_runs_created_at_idx on public.po_ingest_runs (created_at);
