create table public.packing_lists (
  id bigint generated always as identity primary key,
  num_pl integer not null,
  customer_id bigint references public.customers (id),
  customer text,
  date date,
  ship_date date,
  customer_po text,
  state text,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'dispatched')),
  dispatched_at timestamptz,
  ship_to_name text,
  ship_to_address text,
  ship_to_city text,
  ship_to_state text,
  ship_to_zip text,
  bill_to_name text,
  bill_to_address text,
  bill_to_city text,
  bill_to_state text,
  bill_to_zip text
);

create index packing_lists_num_pl_idx on public.packing_lists (num_pl);
create index packing_lists_customer_id_idx on public.packing_lists (customer_id);
create index packing_lists_customer_po_idx on public.packing_lists (customer_po);
create index packing_lists_status_idx on public.packing_lists (status);
