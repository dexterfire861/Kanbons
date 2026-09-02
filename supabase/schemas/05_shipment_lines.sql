create table public.shipment_lines (
  id bigint generated always as identity primary key,
  shipment_id bigint not null references public.shipments (id) on delete cascade,
  product_id bigint references public.products (id),
  sku text,
  product text,
  yards_pcs numeric,
  unit integer,
  type_of_unit text
);

create index shipment_lines_shipment_id_idx on public.shipment_lines (shipment_id);
create index shipment_lines_product_id_idx on public.shipment_lines (product_id);
