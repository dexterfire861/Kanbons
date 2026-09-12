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

create table public.purchase_order_lines (
  id bigint generated always as identity primary key,
  purchase_order_id bigint not null references public.purchase_orders (id) on delete cascade,
  description text,
  item_code text,
  quantity numeric,
  um text,
  unit_price numeric,
  ext_amount numeric,
  product_id bigint references public.products (id)
);

create index purchase_order_lines_purchase_order_id_idx
  on public.purchase_order_lines (purchase_order_id);
create index purchase_order_lines_product_id_idx
  on public.purchase_order_lines (product_id);
