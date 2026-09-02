create table public.packing_lists (
  id bigint generated always as identity primary key,
  num_pl integer not null,
  customer_id integer references public.customers (id),
  customer text,
  date date,
  ship_date date,
  customer_po text,
  state text
);

create index packing_lists_num_pl_idx on public.packing_lists (num_pl);
create index packing_lists_customer_id_idx on public.packing_lists (customer_id);
create index packing_lists_customer_po_idx on public.packing_lists (customer_po);
