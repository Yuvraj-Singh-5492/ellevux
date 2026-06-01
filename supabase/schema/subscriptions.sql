-- subscriptions table: the source of truth for paid access.
-- Written ONLY by the paypal-webhook Edge Function (service role).
-- The front-end reads it (RLS: a user can read their own row).

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paypal_subscription_id text,
  plan_id text,
  status text not null default 'inactive',   -- 'active' | 'inactive'
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users may read their own subscription (for the pricing guard + dashboard).
create policy "read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No client write/update/delete policies on purpose: only the Edge Function
-- (service role, which bypasses RLS) may write. This is what makes activation
-- tamper-proof — the browser cannot insert an 'active' row for itself.
