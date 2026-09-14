create index if not exists packing_lists_status_idx on public.packing_lists (status);
create index if not exists shipments_arrival_date_idx on public.shipments (arrival_date);
