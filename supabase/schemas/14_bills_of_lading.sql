create table public.bills_of_lading (
  id bigint generated always as identity primary key,
  num_bol integer not null,
  date date,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed'))
);

create index bills_of_lading_num_bol_idx on public.bills_of_lading (num_bol);
create index bills_of_lading_status_idx on public.bills_of_lading (status);
