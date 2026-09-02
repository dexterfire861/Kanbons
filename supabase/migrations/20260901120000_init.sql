-- generated from supabase/schemas/*.sql

-- 01_customers.sql
create table public.customers (
  id integer primary key,
  name text not null,
  address text,
  city text,
  state text,
  zip_code text,
  point_of_contact text,
  id_cust text unique,
  email_contact text
);

create index customers_name_idx on public.customers (name);

-- 02_products.sql
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

-- 03_product_mappings.sql
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

-- 04_shipments.sql
create table public.shipments (
  id bigint generated always as identity primary key,
  number integer not null,
  country text,
  container_number text,
  arrival_date date,
  departure_date date
);

create index shipments_number_idx on public.shipments (number);
create index shipments_container_number_idx on public.shipments (container_number);

-- 05_shipment_lines.sql
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

-- 06_packing_lists.sql
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

-- 07_packing_list_lines.sql
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

-- 08_stock.sql
create table public.stock (
  product_id bigint primary key references public.products (id),
  quantity integer,
  contador_physical numeric,
  contador_counted_at timestamptz
);

-- 09_views.sql
create view public.packing_list_line_totals as
select
  l.id,
  l.packing_list_id,
  l.product_id,
  l.product,
  l.yards_pieces,
  l.unit,
  l.type_of_unit,
  l.pre_uni,
  l.yards_pieces * l.pre_uni as total
from public.packing_list_lines l;

create view public.contador as
select
  p.id as product_id,
  p.num,
  p.product,
  p.unit_pack,
  p.pre_uni,
  coalesce(recv.have, 0) as have,
  coalesce(sold.sold, 0) as sold,
  coalesce(recv.have, 0) - coalesce(sold.sold, 0) as difference,
  s.quantity as book_quantity,
  case
    when s.quantity is not null and p.unit_pack is not null
      then s.quantity * p.unit_pack
  end as book_measurement,
  s.contador_physical as warehouse,
  s.contador_counted_at,
  case
    when s.quantity is not null
      and abs(
        coalesce(recv.have, 0) - coalesce(sold.sold, 0)
        - coalesce(s.quantity * p.unit_pack, s.quantity)
      ) > 0.01
      then true
    else false
  end as book_mismatch,
  case
    when s.contador_physical is not null
      and abs(
        coalesce(s.contador_physical, 0)
        - coalesce(s.quantity * p.unit_pack, s.quantity, 0)
      ) > 0.01
      then true
    else false
  end as warehouse_mismatch
from public.products p
left join public.stock s on s.product_id = p.id
left join (
  select sl.product_id, sum(sl.yards_pcs) as have
  from public.shipment_lines sl
  where sl.product_id is not null
  group by sl.product_id
) recv on recv.product_id = p.id
left join (
  select pll.product_id, sum(pll.yards_pieces) as sold
  from public.packing_list_lines pll
  where pll.product_id is not null
  group by pll.product_id
) sold on sold.product_id = p.id;

