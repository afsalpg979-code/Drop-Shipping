-- Admin operations and account controls.
alter table public.profiles add column if not exists account_status text not null default 'active' check(account_status in ('active','suspended'));
alter table public.products add column if not exists compare_at_price_inr numeric(12,2) check(compare_at_price_inr is null or compare_at_price_inr>=0);
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists payment_status text not null default 'pending' check(payment_status in ('pending','paid','failed','partially_refunded','refunded'));
alter table public.orders add column if not exists shipping_provider text;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
create index if not exists idx_profiles_role_status on public.profiles(role,account_status);
create index if not exists idx_products_active_updated on public.products(is_active,updated_at desc);
