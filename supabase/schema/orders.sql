-- orders table: the onboarding funnel record for a NEW customer.
--
-- Unlike `subscriptions` (keyed by an existing auth.users id), an order exists
-- BEFORE the customer has an account. The customer pays as a guest, we capture
-- them here, they fill the intake form, and only at provisioning do we create
-- their auth.users account + a subscriptions row and link it back here.
--
-- The row id (a uuid) doubles as the capability token: it travels on the PayPal
-- subscription's `custom_id`, and it's the `?token=` in the onboarding link.
--
-- Written ONLY by the Edge Functions (service role). No anon policies on
-- purpose — the browser can never read or forge an order. The onboarding form
-- reaches it through the `submit-intake` function, not directly.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),   -- = custom_id + onboarding ?token=

  -- captured at checkout (guest)
  email text not null,
  name text,
  business_name text,
  plan_id text,

  -- payment (filled by paypal-webhook on a confirmed payment)
  paypal_subscription_id text,

  -- lifecycle: pending_payment -> paid -> intake_received -> provisioning -> live
  --            (or 'cancelled' on a PayPal cancel/expire/suspend)
  status text not null default 'pending_payment',

  -- the customer's answers from onboarding.html (used to tune the agent)
  intake jsonb,

  -- filled at provisioning (Stage 3)
  assigned_number text,           -- the Twilio number the agent answers on
  vapi_agent_id text,             -- the provisioned voice agent
  user_id uuid references auth.users(id) on delete set null,  -- once the account exists

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fast lookups the functions need.
create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_status_idx on public.orders (status);
create unique index if not exists orders_paypal_sub_idx
  on public.orders (paypal_subscription_id)
  where paypal_subscription_id is not null;

alter table public.orders enable row level security;

-- No client policies: only the Edge Functions (service role, which bypasses
-- RLS) may read or write. This keeps the funnel tamper-proof, exactly like
-- `subscriptions` — the browser cannot list customers or fake a paid order.
