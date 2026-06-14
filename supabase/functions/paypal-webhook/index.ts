// Supabase Edge Function: paypal-webhook
// Tamper-proof activation for the PayPal subscription paywall.
//
// PayPal calls this URL on subscription events. We:
//   1. Verify the webhook signature with PayPal (so nobody can fake a payment).
//   2. On a confirmed payment, flip the matching ORDER to `paid` and email the
//      customer their onboarding link (once).
//   3. On cancel/expire/suspend, mark the order cancelled (and, if an account
//      has already been provisioned for it, deactivate that account).
//
// custom_id carries our `orders.id` (set in pricing.html createSubscription) —
// NOT a Supabase user id. In this funnel the customer pays as a guest and only
// gets an account later, at provisioning.
//
// ---- DEPLOY ----
//   supabase functions deploy paypal-webhook --no-verify-jwt
//   supabase secrets set PAYPAL_CLIENT_ID=...   PAYPAL_SECRET=... \
//        PAYPAL_WEBHOOK_ID=...   PAYPAL_API=https://api-m.sandbox.paypal.com \
//        SUPABASE_URL=...        SUPABASE_SERVICE_ROLE_KEY=... \
//        RESEND_API_KEY=...      EMAIL_FROM="Ellevux <onboarding@resend.dev>" \
//        SITE_URL=https://ellevux.vercel.app
//   (PAYPAL_API -> https://api-m.paypal.com for live. RESEND_API_KEY/EMAIL_FROM/
//    SITE_URL are optional — without RESEND_API_KEY the order still flips to
//    paid, the welcome email is just skipped.)
// Then in the PayPal dashboard add this function's URL as a Webhook and
// subscribe to BILLING.SUBSCRIPTION.* events; copy the Webhook ID into the secret.

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

// Send the "your agent is on the way" email with the onboarding link.
// No-ops (with a log) if RESEND_API_KEY isn't set, so activation never depends on it.
async function sendWelcomeEmail(to: string, businessName: string | null, orderId: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { console.log("RESEND_API_KEY not set — skipping welcome email"); return; }
  const from = Deno.env.get("EMAIL_FROM") ?? "Ellevux <onboarding@resend.dev>";
  const site = (Deno.env.get("SITE_URL") ?? "https://ellevux.vercel.app").replace(/\/$/, "");
  const link = `${site}/onboarding.html?token=${orderId}`;
  const biz = businessName || "your business";

  const html = `
  <div style="margin:0;padding:0;background:#f4f4f5;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;margin-bottom:24px;">ellevux</div>
      <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:32px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;">Welcome aboard — your AI receptionist is on the way.</h1>
        <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 20px;">
          Thanks for choosing Ellevux. We're getting started on the agent for <strong>${biz}</strong>.
          One quick step so we tune it to your business: tell us how it should answer, what to book, and your hours.
        </p>
        <a href="${link}" style="display:inline-block;background:#8a2be2;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;">Set up your agent</a>
        <p style="font-size:13px;line-height:1.6;color:#71717a;margin:22px 0 0;">
          It takes about 3 minutes. Once you're done, our team builds and launches your agent — you'll get your dashboard login and your agent's phone number within <strong>1 business day</strong>.
        </p>
        <p style="font-size:12px;color:#a1a1aa;margin:18px 0 0;word-break:break-all;">Or paste this link: ${link}</p>
      </div>
      <p style="font-size:12px;color:#a1a1aa;text-align:center;margin:20px 0 0;">Questions? Just reply to this email.</p>
    </div>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: "Your Ellevux agent is on the way", html, reply_to: "hello@ellevux.com" }),
    });
    if (!res.ok) console.error("Resend send failed", res.status, await res.text());
  } catch (e) { console.error("Resend error", e); }
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
  const orderId = resource.custom_id;            // our orders.id, set client-side
  const subscriptionId = resource.id;

  if (!orderId) return new Response("no custom_id", { status: 200 }); // nothing to map; ack so PayPal stops retrying

  const now = new Date().toISOString();

  // NOTE: BILLING.SUBSCRIPTION.CREATED is deliberately NOT here — it fires on
  // popup-open, BEFORE payment. Activating on it would grant access to abandoned
  // checkouts.
  const ACTIVE = ["BILLING.SUBSCRIPTION.ACTIVATED", "PAYMENT.SALE.COMPLETED"];
  const INACTIVE = ["BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED", "BILLING.SUBSCRIPTION.SUSPENDED"];

  if (ACTIVE.includes(type)) {
    // Race-safe flip: only the call that actually transitions pending_payment ->
    // paid gets rows back, so the welcome email is sent exactly once even though
    // ACTIVATED + PAYMENT.SALE.COMPLETED both fire (and SALE fires every month).
    const { data: flipped } = await supabase
      .from("orders")
      .update({ status: "paid", paypal_subscription_id: subscriptionId, updated_at: now })
      .eq("id", orderId)
      .eq("status", "pending_payment")
      .select("id,email,business_name");

    if (flipped && flipped.length) {
      await sendWelcomeEmail(flipped[0].email, flipped[0].business_name, orderId);
    } else {
      // Already past pending_payment (renewal, or duplicate event) — just keep
      // the subscription id current, don't regress status or resend the email.
      await supabase.from("orders")
        .update({ paypal_subscription_id: subscriptionId, updated_at: now })
        .eq("id", orderId);
    }
  } else if (INACTIVE.includes(type)) {
    await supabase.from("orders")
      .update({ status: "cancelled", updated_at: now })
      .eq("id", orderId);

    // If an account was already provisioned for this order, deactivate it too.
    const { data: order } = await supabase
      .from("orders").select("user_id").eq("id", orderId).maybeSingle();
    if (order?.user_id) {
      await supabase.from("subscriptions")
        .update({ status: "inactive", updated_at: now })
        .eq("user_id", order.user_id);
      await supabase.from("agents")
        .update({ status: "cancelling" })
        .eq("user_id", order.user_id);
    }
  }

  return new Response("ok", { status: 200 });
});
