// Supabase Edge Function: create-order
// Called by pricing.html the moment a guest commits to a plan, BEFORE PayPal.
// Creates a `pending_payment` order and returns its id, which the browser then
// passes to PayPal as custom_id. The paypal-webhook later flips it to `paid`.
//
// The browser can't write `orders` directly (no anon RLS), so this service-role
// function is the only way in. It's deliberately minimal — an unpaid pending
// order grants nothing until a real PayPal payment activates it.
//
//   { plan, name, email, business_name } -> { ok, order_id }
//
// ---- DEPLOY ----
//   supabase functions deploy create-order --no-verify-jwt
//   (reuses the SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY secrets already set.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PLANS = ["Starter", "Growth", "Scale"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let p: { plan?: string; name?: string; email?: string; business_name?: string };
  try { p = await req.json(); }
  catch { return json({ ok: false, reason: "bad_request" }, 400); }

  const plan = (p.plan ?? "").trim();
  const name = (p.name ?? "").trim().slice(0, 120);
  const email = (p.email ?? "").trim().slice(0, 200);
  const business_name = (p.business_name ?? "").trim().slice(0, 160);

  if (!PLANS.includes(plan)) return json({ ok: false, reason: "bad_plan" });
  if (!EMAIL_RE.test(email)) return json({ ok: false, reason: "bad_email" });
  if (!business_name) return json({ ok: false, reason: "missing_business" });

  const { data, error } = await supabase
    .from("orders")
    .insert({ email, name, business_name, plan_id: plan, status: "pending_payment" })
    .select("id")
    .single();

  if (error || !data) return json({ ok: false, reason: "create_failed" });
  return json({ ok: true, order_id: data.id });
});
