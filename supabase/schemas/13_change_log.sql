create table public.change_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id bigint not null,
  field text not null,
  from_value text,
  to_value text,
  who text not null default 'admin',
  created_at timestamptz not null default now()
);

create index change_log_row_idx on public.change_log (table_name, row_id);
create index change_log_created_at_idx on public.change_log (created_at desc);
