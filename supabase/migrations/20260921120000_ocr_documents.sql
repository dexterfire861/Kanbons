create table public.ocr_documents (
  id bigint generated always as identity primary key,
  kind text not null
    check (kind in ('customer_po', 'supplier', 'bill_of_lading')),
  filename text not null,
  storage_path text,
  extracted_json jsonb,
  confirmed_json jsonb,
  diff_json jsonb,
  status text not null
    check (status in ('failed', 'unmatched', 'saved')),
  packing_list_id bigint references public.packing_lists (id),
  shipment_id bigint references public.shipments (id),
  bol_id bigint references public.bills_of_lading (id),
  created_at timestamptz not null default now()
);

create index ocr_documents_kind_idx on public.ocr_documents (kind);
create index ocr_documents_created_at_idx on public.ocr_documents (created_at);

insert into storage.buckets (id, name, public)
values ('ocr-documents', 'ocr-documents', true)
on conflict (id) do nothing;

create policy "ocr_documents_read"
on storage.objects for select
using (bucket_id = 'ocr-documents');

create policy "ocr_documents_write"
on storage.objects for insert
with check (bucket_id = 'ocr-documents');

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
