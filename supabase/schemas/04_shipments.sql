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
