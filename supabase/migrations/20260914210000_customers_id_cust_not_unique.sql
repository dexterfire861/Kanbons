alter table public.customers drop constraint if exists customers_id_cust_key;
create index if not exists customers_id_cust_idx on public.customers (id_cust);
