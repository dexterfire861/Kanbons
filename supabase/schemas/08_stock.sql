create table public.stock (
  product_id bigint primary key references public.products (id),
  quantity integer,
  contador_physical numeric,
  contador_counted_at timestamptz
);
