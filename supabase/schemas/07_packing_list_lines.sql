create table public.packing_list_lines (
  id bigint generated always as identity primary key,
  packing_list_id bigint not null references public.packing_lists (id) on delete cascade,
  product_id bigint references public.products (id),
  product text,
  yards_pieces numeric,
  unit integer,
  type_of_unit text,
  pre_uni numeric
);

create index packing_list_lines_packing_list_id_idx on public.packing_list_lines (packing_list_id);
create index packing_list_lines_product_id_idx on public.packing_list_lines (product_id);
