alter table public.shipments
  rename column container_number to invoice_number;

drop index if exists public.shipments_container_number_idx;

create index shipments_invoice_number_idx on public.shipments (invoice_number);

update public.shipment_lines
set type_of_unit = case lower(trim(type_of_unit))
  when 'yard' then 'yards'
  when 'yd' then 'yards'
  when 'yds' then 'yards'
  when 'yards' then 'yards'
  when 'piece' then 'pieces'
  when 'pc' then 'pieces'
  when 'pcs' then 'pieces'
  when 'pieces' then 'pieces'
  when 'set' then 'sets'
  when 'sets' then 'sets'
  when 'box' then 'boxes'
  when 'boxes' then 'boxes'
  when 'bundle' then 'bundles'
  when 'bundles' then 'bundles'
  else null
end
where type_of_unit is not null;

alter table public.shipment_lines
  drop constraint if exists shipment_lines_type_of_unit_check;

alter table public.shipment_lines
  add constraint shipment_lines_type_of_unit_check
  check (
    type_of_unit is null
    or type_of_unit in ('yards', 'pieces', 'sets', 'boxes', 'bundles')
  );
