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
