create table public.product_mappings (
  id bigint generated always as identity primary key,
  client_name text not null,
  kanbons_name text,
  item_code text,
  product_id bigint references public.products (id)
);

create index product_mappings_client_name_idx on public.product_mappings (client_name);
create index product_mappings_item_code_idx on public.product_mappings (item_code);
create index product_mappings_product_id_idx on public.product_mappings (product_id);
