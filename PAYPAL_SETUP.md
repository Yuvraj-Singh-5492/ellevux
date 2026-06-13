# PayPal Paywall — Setup Guide (Stripe stopgap)

A temporary, **secure** paywall: PayPal subscriptions with a one-time **$297 setup fee**
+ monthly recurring, activated server-side by a Supabase Edge Function (so it can't be
faked from the browser).

Pieces (all already in the repo):
- `pricing.html` — PayPal Subscribe buttons + "already subscribed" guard.
- `supabase/functions/paypal-webhook/index.ts` — verifies payments, activates accounts.
- `supabase/schema/subscriptions.sql` — the paid-access source-of-truth table.

Work in **Sandbox** first, then repeat with Live credentials.

---

## ✅ CURRENT STATE — Sandbox configured (2026-06-12)
Steps 1–6 are DONE for sandbox (product/plans/webhook created via API; pricing.html wired):
- Product: `PROD-0A695237J4256643S`
- Plans (ACTIVE, each with $297 setup fee, fail→cancel):
  Starter `P-5TX99968D0409622GNIV4SOI` · Growth `P-5FS82625SG0654936NIV4SOI` · Scale `P-9XS88973G17884719NIV4SOQ`
- Webhook: `25D16552C7672094N` → `https://lndkbsdkflpydpkfpkny.supabase.co/functions/v1/paypal-webhook`
  (subscribed: BILLING.SUBSCRIPTION.CREATED/ACTIVATED/UPDATED/CANCELLED/EXPIRED/SUSPENDED + PAYMENT.SALE.COMPLETED)
- `subscriptions` table exists; Edge Function deployed; sandbox Client ID + Plan IDs are in pricing.html.

2026-06-12 LATER: the 4 secrets ARE SET on the function (verified via `secrets list`), and the
pipeline was **verified end-to-end in sandbox**: API-created subscription `I-GKBDU6EF6XJL`
(custom_id = test user `59441b19-…fb857`) → real signed webhook → function verified signature →
`subscriptions` row upserted `active` → RLS read-own returned it. PASS.

⚠️ FLAW FOUND + FIXED IN SOURCE (needs redeploy): the function previously activated on
`BILLING.SUBSCRIPTION.CREATED`, which fires on popup-open BEFORE payment → abandoned checkouts
got free access. `index.ts` now activates only on ACTIVATED / PAYMENT.SALE.COMPLETED.
**Redeploy required:** `supabase functions deploy paypal-webhook --no-verify-jwt` (user's terminal).

REMAINING: (a) redeploy the fixed function; (b) optional human browser test (popup → approve with
sandbox buyer → row active after ACTIVATED, not before); (c) cleanup: delete test row/user
`59441b19-…fb857` + any rows activated by abandoned popups (Table Editor), sandbox sub
`I-GKBDU6EF6XJL` just expires; (d) go-live (step 8).
NOTE: free-tier Supabase pauses after ~7 idle days → login/paywall die until restored in the dashboard.
NOTE: signup currently returns a session with NO email confirmation — decide before launch.

---

## 1. PayPal Business account + REST app
1. Sign up / log in at **https://developer.paypal.com**.
2. **Apps & Credentials → Sandbox → Create App.** Copy the **Client ID** and **Secret**.

## 2. Create a subscription Plan per tier (with the $297 setup fee)
PayPal subscriptions = a **Product** + a **Plan** per tier.
1. **Pay & Get Paid → Subscriptions → Plans** (or via API).
2. Create a Product (e.g. "Ellevux AI Receptionist").
3. For each tier create a Plan:
   - **Starter** — $149 / month recurring
   - **Growth** — $299 / month recurring
   - **Scale** — $499 / month recurring
   - On each plan set a **Setup fee = $297** (one-time, charged on the first cycle) and
     "Setup fee fails → cancel".
4. Copy each **Plan ID** (`P-xxxxxxxxxxxxx`).

## 3. Wire the front-end (`pricing.html`, top config block)
```js
const PAYPAL_CLIENT_ID = "YOUR_SANDBOX_CLIENT_ID";
const PAYPAL_PLANS = { Starter:"P-...", Growth:"P-...", Scale:"P-..." };
const PAYPAL_SETUP_FEES = { Starter: 297, Growth: 297, Scale: 297 }; // display only
```
While `PAYPAL_CLIENT_ID` is empty the page uses the old mock activation, so nothing breaks.

## 4. Create the database table
Run `supabase/schema/subscriptions.sql` in the **Supabase SQL editor** (or `supabase db push`).

## 5. Deploy the webhook Edge Function
```bash
supabase login
supabase functions deploy paypal-webhook --no-verify-jwt
supabase secrets set \
  PAYPAL_CLIENT_ID=...  PAYPAL_SECRET=...  PAYPAL_WEBHOOK_ID=PLACEHOLDER \
  PAYPAL_API=https://api-m.sandbox.paypal.com \
  SUPABASE_URL=https://YOURPROJECT.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=...   # Supabase dashboard → Settings → API → service_role (keep secret!)
```
This prints the function URL, e.g. `https://YOURPROJECT.supabase.co/functions/v1/paypal-webhook`.

## 6. Register the webhook in PayPal
1. **Apps & Credentials → your app → Add Webhook.**
2. URL = the function URL from step 5.
3. Subscribe to events: **all `BILLING.SUBSCRIPTION.*`** (activated, cancelled, expired, suspended)
   and **`PAYMENT.SALE.COMPLETED`**.
4. Copy the generated **Webhook ID**, then update the secret:
   `supabase secrets set PAYPAL_WEBHOOK_ID=THE_REAL_ID`

## 7. Test (sandbox)
1. Use a PayPal **sandbox buyer** account to subscribe through the pricing page.
2. Confirm: a row appears in `subscriptions` with `status='active'`, and the
   dashboard shows the agent active.
3. Cancel from the PayPal sandbox → webhook flips the row to `inactive`.

## 8. Go live
Repeat with **Live** Client ID/Secret/Plan IDs, set `PAYPAL_API=https://api-m.paypal.com`,
re-register the live webhook, update secrets. Done.

---

### How the security works
- The browser **cannot** grant itself access — it has no write policy on `subscriptions`.
- Only the Edge Function (service-role key, server-side) writes there, and only **after**
  PayPal's signature is verified. So a faked `onApprove` in dev tools does nothing.
- `custom_id` carries the Supabase user id from checkout → webhook, mapping payment → account.

### When Stripe is ready
Swap the front-end buttons for Stripe Checkout and point a Stripe webhook at the same
`subscriptions` table. The table + dashboard logic stay; only the payment rail changes.
