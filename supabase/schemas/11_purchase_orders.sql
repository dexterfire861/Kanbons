create table public.purchase_orders (
  id bigint generated always as identity primary key,
  customer_po text,
  customer_id bigint references public.customers (id),
  date date,
  ship_date date,
  vendor_name text,
  ship_to_name text,
  ship_to_address text,
  ship_to_city text,
  ship_to_state text,
  ship_to_zip text,
  source_path text,
  ocr_markdown text,
  packing_list_id bigint references public.packing_lists (id),
  status text not null default 'needs_review'
    check (status in ('needs_review', 'ready')),
  issues text,
  gold_json jsonb,
  created_at timestamptz not null default now()
);

create index purchase_orders_customer_po_idx on public.purchase_orders (customer_po);
create index purchase_orders_status_idx on public.purchase_orders (status);
create index purchase_orders_packing_list_id_idx on public.purchase_orders (packing_list_id);
