-- FALCONS STORE commerce, support and analytics extensions.
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check(quantity between 1 and 99),
  created_at timestamptz not null default now(),
  unique(cart_id, product_id)
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check(char_length(subject) between 4 and 160),
  message text not null check(char_length(message) between 10 and 5000),
  category text not null default 'general',
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  status text not null default 'open' check(status in ('open','in_progress','waiting_customer','resolved','closed')),
  ai_summary text,
  ai_suggested_reply text,
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.support_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  message text not null check(char_length(message) between 1 and 5000),
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  change_quantity integer not null,
  reason text not null,
  reference text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.analytics_forecasts (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  period_start date not null,
  period_end date not null,
  predicted_value numeric(14,2) not null,
  model_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cart_items_cart on public.cart_items(cart_id);
create index if not exists idx_support_user_created on public.support_tickets(user_id, created_at desc);
create index if not exists idx_support_status on public.support_tickets(status, priority);
create index if not exists idx_inventory_product_created on public.inventory_movements(product_id, created_at desc);
create index if not exists idx_orders_created on public.orders(created_at desc);
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_replies enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.analytics_forecasts enable row level security;
create policy "customers manage own carts" on public.carts for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "customers manage own cart items" on public.cart_items for all using(exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid())) with check(exists(select 1 from public.carts c where c.id=cart_id and c.user_id=auth.uid()));
create policy "customers read own support tickets" on public.support_tickets for select using(user_id=auth.uid() or public.current_app_role() in ('admin','staff'));
create policy "customers create own support tickets" on public.support_tickets for insert with check(user_id=auth.uid());
create policy "staff update support tickets" on public.support_tickets for update using(public.current_app_role() in ('admin','staff')) with check(public.current_app_role() in ('admin','staff'));
create policy "ticket participants read replies" on public.support_replies for select using(exists(select 1 from public.support_tickets t where t.id=ticket_id and (t.user_id=auth.uid() or public.current_app_role() in ('admin','staff'))));
create policy "ticket owners and staff add replies" on public.support_replies for insert with check(author_id=auth.uid() and exists(select 1 from public.support_tickets t where t.id=ticket_id and (t.user_id=auth.uid() or public.current_app_role() in ('admin','staff'))));
create policy "staff read inventory movements" on public.inventory_movements for select using(public.current_app_role() in ('admin','staff'));
create policy "staff read forecasts" on public.analytics_forecasts for select using(public.current_app_role() in ('admin','staff'));
-- Server-side privileged operations use the service role after validating the caller's JWT and role.
