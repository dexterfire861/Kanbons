create table public.customers (
  id integer primary key,
  name text not null,
  address text,
  city text,
  state text,
  zip_code text,
  point_of_contact text,
  id_cust text unique,
  email_contact text
);

create index customers_name_idx on public.customers (name);
