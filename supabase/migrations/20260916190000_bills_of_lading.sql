create table public.bills_of_lading (
  id bigint generated always as identity primary key,
  num_bol integer not null,
  date date,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed'))
);

create index bills_of_lading_num_bol_idx on public.bills_of_lading (num_bol);
create index bills_of_lading_status_idx on public.bills_of_lading (status);

create table public.bill_of_lading_lines (
  id bigint generated always as identity primary key,
  bol_id bigint not null references public.bills_of_lading (id) on delete cascade,
  packing_list_id bigint not null references public.packing_lists (id),
  product_id bigint references public.products (id),
  yards_pieces numeric
);

create index bill_of_lading_lines_bol_id_idx on public.bill_of_lading_lines (bol_id);
create index bill_of_lading_lines_packing_list_id_idx
  on public.bill_of_lading_lines (packing_list_id);
create index bill_of_lading_lines_product_id_idx
  on public.bill_of_lading_lines (product_id);
