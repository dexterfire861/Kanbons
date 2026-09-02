create table public.products (
  id bigint generated always as identity primary key,
  num text not null unique,
  product text not null,
  unit_pack integer,
  type_of_unit text,
  type_of_unit_customer text,
  unit_of_measurement text,
  pre_uni numeric
);

create index products_product_idx on public.products (product);
