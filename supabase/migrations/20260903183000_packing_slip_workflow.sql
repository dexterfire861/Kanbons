alter table public.packing_lists
  add column if not exists status text not null default 'dispatched',
  add column if not exists dispatched_at timestamptz,
  add column if not exists ship_to_name text,
  add column if not exists ship_to_address text,
  add column if not exists ship_to_city text,
  add column if not exists ship_to_state text,
  add column if not exists ship_to_zip text,
  add column if not exists bill_to_name text,
  add column if not exists bill_to_address text,
  add column if not exists bill_to_city text,
  add column if not exists bill_to_state text,
  add column if not exists bill_to_zip text;

alter table public.packing_lists
  drop constraint if exists packing_lists_status_check;

alter table public.packing_lists
  add constraint packing_lists_status_check
  check (status in ('draft', 'confirmed', 'dispatched'));

update public.packing_lists
set status = 'dispatched'
where status is null or status = '';
