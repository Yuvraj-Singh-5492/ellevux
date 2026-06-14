// Supabase Edge Function: provision-agent
// The Stage 3 admin action, driven by admin.html. Gated by ADMIN_SECRET (NOT a
// Supabase login) since it runs from a small internal console.
//
//   { action: "list",     admin_secret }
//       -> { ok, orders: [...] }  (everyone paid -> live, with their intake)
//
//   { action: "provision", admin_secret, order_id, assigned_number, vapi_agent_id }
//       -> creates the customer's auth account, activates their subscription,
//          saves the number + vapi id, flips the order to `live`, emails the
//          login + temp password + agent number. Returns the temp password so
//          you have a copy if the email bounces.
//
// ---- DEPLOY ----
//   supabase functions deploy provision-agent --no-verify-jwt
//   supabase secrets set ADMIN_SECRET=<a long random string only you know>
//   (reuses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + RESEND_API_KEY +
//    EMAIL_FROM + SITE_URL already set for the other functions.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role -> bypasses RLS; admin-only
);

const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET");

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

// Readable, strong-ish temporary password: e.g. "Ab3Kp-9mNq2-Rs7Tv".
function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(15);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length];
  return `${out.slice(0, 5)}-${out.slice(5, 10)}-${out.slice(10, 15)}`;
}

async function sendCredentialsEmail(
  to: string, businessName: string | null, password: string,
  agentNumber: string, loginUrl: string,
): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { console.log("RESEND_API_KEY not set — skipping credentials email"); return false; }
  const from = Deno.env.get("EMAIL_FROM") ?? "Ellevux <onboarding@resend.dev>";
  const biz = businessName || "your business";

  const html = `
  <div style="margin:0;padding:0;background:#f4f4f5;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;margin-bottom:24px;">ellevux</div>
      <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:32px;">
        <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;">Your AI receptionist is live.</h1>
        <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 22px;">
          The agent for <strong>${biz}</strong> is built, tuned, and answering calls. Here's everything you need.
        </p>

        <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:18px 20px;margin:0 0 18px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#7e22ce;font-weight:700;margin-bottom:6px;">Your agent's number</div>
          <div style="font-size:24px;font-weight:700;color:#18181b;letter-spacing:0.01em;">${agentNumber}</div>
          <div style="font-size:13px;color:#71717a;margin-top:4px;">Forward your business line here, or hand this out directly.</div>
        </div>

        <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:18px 20px;margin:0 0 22px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#52525b;font-weight:700;margin-bottom:10px;">Your dashboard login</div>
          <div style="font-size:14px;color:#3f3f46;margin-bottom:4px;">Email: <strong>${to}</strong></div>
          <div style="font-size:14px;color:#3f3f46;">Temporary password: <strong style="font-family:ui-monospace,Menlo,Consolas,monospace;">${password}</strong></div>
        </div>

        <a href="${loginUrl}" style="display:inline-block;background:#8a2be2;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;">Log in to your dashboard</a>

        <p style="font-size:13px;line-height:1.6;color:#71717a;margin:22px 0 0;">
          For your security, please change this password after your first sign-in (Dashboard &rarr; Settings).
        </p>
      </div>
      <p style="font-size:12px;color:#a1a1aa;text-align:center;margin:20px 0 0;">Questions? Just reply to this email.</p>
    </div>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `Your Ellevux agent is live — login inside`, html, reply_to: "hello@ellevux.com" }),
    });
    if (!res.ok) { console.error("Resend send failed", res.status, await res.text()); return false; }
    return true;
  } catch (e) { console.error("Resend error", e); return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let p: {
    action?: string; admin_secret?: string; order_id?: string;
    assigned_number?: string; vapi_agent_id?: string;
  };
  try { p = await req.json(); }
  catch { return json({ ok: false, reason: "bad_request" }, 400); }

  // Gate: only callers with the shared admin secret may do anything here.
  if (!ADMIN_SECRET || p.admin_secret !== ADMIN_SECRET) {
    return json({ ok: false, reason: "unauthorized" }, 401);
  }

  const now = new Date().toISOString();

  // ---- LIST: everyone from paid through live, with their intake ----
  if (p.action === "list") {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id,email,name,business_name,plan_id,status,intake,assigned_number,vapi_agent_id,paypal_subscription_id,created_at,updated_at")
      .in("status", ["paid", "intake_received", "provisioning", "live"])
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return json({ ok: false, reason: "list_failed" });
    return json({ ok: true, orders });
  }

  // ---- PROVISION: create account, activate, save number + vapi, email login ----
  if (p.action === "provision") {
    const orderId = (p.order_id ?? "").trim();
    const assignedNumber = (p.assigned_number ?? "").trim();
    const vapiAgentId = (p.vapi_agent_id ?? "").trim();
    if (!orderId) return json({ ok: false, reason: "missing_order" });
    if (!assignedNumber) return json({ ok: false, reason: "missing_number" });

    const { data: order, error } = await supabase
      .from("orders")
      .select("id,email,name,business_name,plan_id,status,paypal_subscription_id")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !order) return json({ ok: false, reason: "not_found" });
    if (!["paid", "intake_received", "provisioning"].includes(order.status)) {
      return json({ ok: false, reason: "bad_status", status: order.status });
    }

    // 1. Create the customer's auth account.
    const password = genPassword();
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email: order.email,
      password,
      email_confirm: true,
      user_metadata: { business_name: order.business_name, full_name: order.name },
    });
    if (cErr || !created?.user) {
      // Most likely the email already has an account — surface it for manual handling.
      return json({ ok: false, reason: "account_failed", detail: cErr?.message ?? "no user returned" });
    }
    const userId = created.user.id;

    // 2. Activate their subscription (the dashboard's source of truth).
    await supabase.from("subscriptions").upsert({
      user_id: userId,
      plan_id: order.plan_id,
      paypal_subscription_id: order.paypal_subscription_id,
      status: "active",
      updated_at: now,
    }, { onConflict: "user_id" });

    // 3. Finalize the order.
    await supabase.from("orders").update({
      user_id: userId,
      assigned_number: assignedNumber,
      vapi_agent_id: vapiAgentId || null,
      status: "live",
      updated_at: now,
    }).eq("id", orderId);

    // 3b. Create the dashboard agent row so the customer sees their receptionist
    // on first login. Best-effort — a failure here never blocks provisioning.
    const agentName = order.business_name ? `${order.business_name} Receptionist` : "AI Receptionist";
    const { error: agentErr } = await supabase.from("agents").insert({
      user_id: userId,
      name: agentName,
      voice_id: "custom",
      status: "online",
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (agentErr) console.error("agents insert failed (non-fatal):", agentErr.message);

    // 4. Email the credentials.
    const site = (Deno.env.get("SITE_URL") ?? "https://ellevux.vercel.app").replace(/\/$/, "");
    const loginUrl = `${site}/login.html`;
    const sent = await sendCredentialsEmail(order.email, order.business_name, password, assignedNumber, loginUrl);

    return json({ ok: true, email: order.email, password, sent });
  }

  return json({ ok: false, reason: "unknown_action" });
});
