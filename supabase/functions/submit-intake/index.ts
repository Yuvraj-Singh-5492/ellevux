// Supabase Edge Function: submit-intake
// Backs the logged-out onboarding form (onboarding.html).
//
// The browser never touches the `orders` table directly (it has no anon RLS
// policies). Instead it calls this function, which uses the service role and
// treats the order-id token as a bearer capability:
//
//   { action: "fetch",  token }                 -> { ok, business_name, email, status }
//   { action: "submit", token, intake: {...} }  -> { ok }  (writes intake, status -> intake_received)
//
// Business-logic responses are HTTP 200 with an `ok` flag so the client can
// read the body straight from supabase.functions.invoke (which treats non-2xx
// as an error and hides the body).
//
// ---- DEPLOY ----
//   supabase functions deploy submit-intake --no-verify-jwt
//   (reuses the SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY secrets already set
//    for paypal-webhook — nothing new to configure.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role -> bypasses RLS; NEVER expose client-side
);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let payload: { action?: string; token?: string; intake?: Record<string, unknown> };
  try { payload = await req.json(); }
  catch { return json({ ok: false, reason: "bad_request" }, 400); }

  const token = (payload.token ?? "").trim();
  const action = payload.action;
  if (!token) return json({ ok: false, reason: "missing_token" });

  // Look up the order by its id (the capability token). A malformed uuid makes
  // PostgREST error -> we treat that the same as not-found.
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,email,business_name,status")
    .eq("id", token)
    .maybeSingle();

  if (error || !order) return json({ ok: false, reason: "not_found" });

  if (action === "fetch") {
    return json({
      ok: true,
      business_name: order.business_name,
      email: order.email,
      status: order.status,
    });
  }

  if (action === "submit") {
    // Only a paid order (or one editing a prior submission) may save intake.
    if (order.status !== "paid" && order.status !== "intake_received") {
      return json({ ok: false, reason: "not_payable", status: order.status });
    }

    const intake = payload.intake;
    if (!intake || typeof intake !== "object") return json({ ok: false, reason: "missing_intake" });
    if (JSON.stringify(intake).length > 20000) return json({ ok: false, reason: "too_large" });

    const { error: upErr } = await supabase
      .from("orders")
      .update({
        intake,
        status: "intake_received",
        updated_at: new Date().toISOString(),
      })
      .eq("id", token);

    if (upErr) return json({ ok: false, reason: "write_failed" });
    return json({ ok: true });
  }

  return json({ ok: false, reason: "unknown_action" });
});
