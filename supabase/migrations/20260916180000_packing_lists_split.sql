alter table public.packing_lists
  add column if not exists split integer not null default 1,
  add column if not exists parent_id bigint references public.packing_lists (id);

create index if not exists packing_lists_parent_id_idx
  on public.packing_lists (parent_id);
