create table public.shipments (
  id bigint generated always as identity primary key,
  number integer not null,
  country text,
  invoice_number text,
  arrival_date date,
  departure_date date
);

create index shipments_number_idx on public.shipments (number);
create index shipments_invoice_number_idx on public.shipments (invoice_number);
create index shipments_arrival_date_idx on public.shipments (arrival_date);
