import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyStripeSignature(raw: string, sigHeader: string | null, secret: string | null) {
  if (!sigHeader || !secret) return null;
  const parts: Record<string, string> = {};
  sigHeader.split(",").forEach((p) => {
    const idx = p.indexOf("=");
    if (idx > 0) parts[p.slice(0, idx)] = p.slice(idx + 1);
  });
  const t = parseInt(parts.t, 10);
  const v1 = parts.v1;
  if (!t || !v1) return null;
  const age = Math.floor(Date.now() / 1000) - t;
  if (Math.abs(age) > 300) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${raw}`));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected !== v1) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const sig = req.headers.get("stripe-signature");
    const raw = await req.text();
    const event = await verifyStripeSignature(raw, sig, webhookSecret);
    if (!event) {
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upgradeMerchant = async (merchantId: string, planCode: string, paymentMode: string) => {
      if (!merchantId || !planCode) return;
      const { data: plans } = await supabase
        .from("subscriptionplans")
        .select("*")
        .eq("code", planCode)
        .limit(1);

      const plan = plans?.[0];
      const update: Record<string, any> = { tier: planCode };
      if (plan) {
        update.quest_quota = plan.quest_quota;
        update.push_quota = plan.push_quota;
        update.geofence_radius = plan.geofence_radius;
      }
      if (paymentMode === "one_time") {
        update.subscription_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      await supabase.from("merchants").update(update).eq("id", merchantId);
    };

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const meta = session.metadata || {};

      if (meta.type === "wallet_topup") {
        const merchantId = meta.merchant_id;
        const addedAmount = Number(meta.topup_amount);
        const sessionId = session.id;

        if (merchantId && addedAmount > 0) {
          // Check idempotency: prevent double credit if Stripe retries webhook
          if (sessionId) {
            const { data: existing } = await supabase
              .from("merchantledgers")
              .select("id")
              .eq("reference_id", sessionId)
              .limit(1);

            if (existing && existing.length > 0) {
              return new Response(JSON.stringify({ received: true, already_processed: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }

          const { data: merchant } = await supabase
            .from("merchants")
            .select("*")
            .eq("id", merchantId)
            .single();

          const newBalance = (merchant?.wallet_balance || 0) + addedAmount;
          await supabase.from("merchants").update({ wallet_balance: newBalance }).eq("id", merchantId);

          await supabase.from("merchantledgers").insert({
            merchant_id: merchantId,
            merchant_name: merchant?.name,
            merchant_owner_id: merchant?.created_by_id,
            type: "topup",
            amount: addedAmount,
            balance_after: newBalance,
            reference_id: sessionId || null,
            description: `เติมเงินผ่าน Stripe PromptPay/Card สำเร็จ (${sessionId || 'Checkout'})`,
          });
        }
      } else {
        await upgradeMerchant(meta.merchant_id, meta.plan_code, meta.payment_mode);
        if (meta.merchant_id && (meta.plan_code === "pro" || meta.type === "pro_booster_subscription")) {
          await supabase.from("merchants").update({
            is_pro: true,
            tier: "pro",
            commission_rate: 0.03,
            stripe_subscription_id: session.subscription || null,
          }).eq("id", meta.merchant_id);
        }
      }
    } else if (event.type === "customer.subscription.deleted") {
      const meta = event.data?.object?.metadata || {};
      if (meta.merchant_id) {
        await supabase.from("merchants").update({
          tier: "starter",
          is_pro: false,
          commission_rate: 0.06,
        }).eq("id", meta.merchant_id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
