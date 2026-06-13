// Supabase Edge Function: paypal-webhook
// Tamper-proof activation for the PayPal subscription paywall.
//
// PayPal calls this URL on subscription events. We:
//   1. Verify the webhook signature with PayPal (so nobody can fake a payment).
//   2. On an active/created subscription, flip the user's account to active.
//   3. On cancel/expire/suspend, mark it inactive.
//
// The Supabase user id travels on the subscription's `custom_id`
// (set in pricing.html createSubscription).
//
// ---- DEPLOY ----
//   supabase functions deploy paypal-webhook --no-verify-jwt
//   supabase secrets set PAYPAL_CLIENT_ID=...        PAYPAL_SECRET=... \
//        PAYPAL_WEBHOOK_ID=...   PAYPAL_API=https://api-m.sandbox.paypal.com \
//        SUPABASE_URL=...        SUPABASE_SERVICE_ROLE_KEY=...
//   (use https://api-m.paypal.com for live)
// Then in the PayPal dashboard add this function's URL as a Webhook and
// subscribe to BILLING.SUBSCRIPTION.* events; copy the Webhook ID into the secret above.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYPAL_API = Deno.env.get("PAYPAL_API") ?? "https://api-m.sandbox.paypal.com";
const CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const SECRET = Deno.env.get("PAYPAL_SECRET")!;
const WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role -> bypasses RLS; NEVER expose client-side
);

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${CLIENT_ID}:${SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = await res.json();
  return json.access_token;
}

// Ask PayPal to confirm the webhook signature is genuine.
async function verifySignature(headers: Headers, body: string, token: string): Promise<boolean> {
  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: WEBHOOK_ID,
      webhook_event: JSON.parse(body),
    }),
  });
  const json = await res.json();
  return json.verification_status === "SUCCESS";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  let token: string;
  try { token = await getAccessToken(); }
  catch { return new Response("auth failed", { status: 500 }); }

  // 1. Reject anything that isn't a genuine PayPal call.
  const ok = await verifySignature(req.headers, raw, token);
  if (!ok) return new Response("invalid signature", { status: 401 });

  const event = JSON.parse(raw);
  const type = event.event_type as string;
  const resource = event.resource ?? {};
  const userId = resource.custom_id;            // Supabase user id we set client-side
  const subscriptionId = resource.id;
  const planId = resource.plan_id;

  if (!userId) return new Response("no custom_id", { status: 200 }); // nothing to map; ack so PayPal stops retrying

  // NOTE: BILLING.SUBSCRIPTION.CREATED is deliberately NOT here — it fires on popup-open,
  // BEFORE payment. Activating on it would grant free access to abandoned checkouts.
  const ACTIVE = ["BILLING.SUBSCRIPTION.ACTIVATED", "PAYMENT.SALE.COMPLETED"];
  const INACTIVE = ["BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED", "BILLING.SUBSCRIPTION.SUSPENDED"];

  let status: string | null = null;
  if (ACTIVE.includes(type)) status = "active";
  else if (INACTIVE.includes(type)) status = "inactive";

  if (status) {
    // upsert the subscription record (this table is the source of truth the
    // front-end guard + dashboard read).
    await supabase.from("subscriptions").upsert({
      user_id: userId,
      paypal_subscription_id: subscriptionId,
      plan_id: planId,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Reflect on agents so existing dashboard logic keeps working.
    if (status === "inactive") {
      await supabase.from("agents").update({ status: "cancelling" }).eq("user_id", userId);
    }
  }

  return new Response("ok", { status: 200 });
});
