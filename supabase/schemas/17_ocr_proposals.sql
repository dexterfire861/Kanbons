create table public.ocr_proposals (
  id bigint generated always as identity primary key,
  kind text not null
    check (kind in ('customer_po', 'supplier', 'bill_of_lading')),
  summary text not null,
  document_ids jsonb not null,
  status text not null default 'proposed'
    check (status = 'proposed'),
  created_at timestamptz not null default now()
);

create index ocr_proposals_kind_idx on public.ocr_proposals (kind);
