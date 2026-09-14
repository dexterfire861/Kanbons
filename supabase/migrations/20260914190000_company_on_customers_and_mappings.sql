alter table public.customers add column if not exists company text;
alter table public.product_mappings add column if not exists company text;

create index if not exists customers_company_idx on public.customers (company);
create index if not exists product_mappings_company_idx on public.product_mappings (company);
