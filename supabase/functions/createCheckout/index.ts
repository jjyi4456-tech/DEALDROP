import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_TOPUP = 100;
const MAX_TOPUP = 50000;
const BONUS_THRESHOLD = 1000;
const BONUS_AMOUNT = 50;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY is not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: Record<string, any> = await req.json().catch(() => ({}));
    const merchantId = String(body?.merchant_id || "").trim();
    const checkoutType = String(body?.checkout_type || "").trim();
    const planCode = String(body?.plan_code || "").trim();
    
    // Fallback origin or dynamic origin from frontend request
    const origin = req.headers.get("origin") || body?.origin || "https://hungry-quest-club.base44.app";
    const paymentMethod = String(body?.payment_method || "card").trim();
    const email = String(body?.email || "").trim();
    const contactName = String(body?.contact_name || "").trim();

    if (!merchantId) {
      return new Response(JSON.stringify({ error: "merchant_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Stripe-Version": "2023-10-16",
      "Idempotency-Key": crypto.randomUUID(),
    };

    const params = new URLSearchParams();
    params.set("metadata[merchant_id]", merchantId);

    if (checkoutType === "wallet_topup") {
      // Case 1: Prepaid Wallet Topup
      const amount = Number(body?.amount);
      if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
        return new Response(
          JSON.stringify({ error: `amount must be between ${MIN_TOPUP} and ${MAX_TOPUP} THB` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const creditAmount = amount + (amount >= BONUS_THRESHOLD ? BONUS_AMOUNT : 0);
      params.set("mode", "payment");
      params.set("payment_method_types[0]", "promptpay");
      params.set("payment_method_types[1]", "card");
      params.set("line_items[0][quantity]", "1");
      params.set("line_items[0][price_data][currency]", "thb");
      params.set("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
      params.set("line_items[0][price_data][product_data][name]", "เติมเงินเครดิตร้านค้า DEALDROP");
      params.set("metadata[type]", "wallet_topup");
      params.set("metadata[topup_amount]", String(creditAmount));
      if (email) params.set("customer_email", email);
      params.set("success_url", `${origin}/merchant/finance?topup=success&session_id={CHECKOUT_SESSION_ID}`);
      params.set("cancel_url", `${origin}/merchant/finance?topup=cancel`);
    } else {
      // Case 2: Subscription Plan Checkout
      if (!planCode) {
        return new Response(JSON.stringify({ error: "plan_code is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Query from Supabase 'subscriptionplans' table
      const { data: plans, error: planError } = await supabase
        .from("subscriptionplans")
        .select("*")
        .eq("code", planCode)
        .limit(1);

      if (planError || !plans || plans.length === 0) {
        return new Response(JSON.stringify({ error: "plan not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const plan = (plans && plans[0]) || { name: "Pro Booster", code: "pro", price: 259 };
      const planPrice = planCode === "pro" ? 259 : (Number(plan.price) || 259);

      params.set("metadata[plan_code]", planCode);
      params.set("metadata[payment_method]", paymentMethod);
      if (contactName) params.set("metadata[contact_name]", contactName);
      if (email) params.set("customer_email", email);

      if (paymentMethod === "promptpay") {
        // One-time PromptPay scan
        params.set("mode", "payment");
        params.set("payment_method_types[0]", "promptpay");
        params.set("line_items[0][quantity]", "1");
        params.set("line_items[0][price_data][currency]", "thb");
        params.set("line_items[0][price_data][unit_amount]", String(Math.round(planPrice * 100)));
        params.set("line_items[0][price_data][product_data][name]", `DEALDROP ${plan.name || "Pro Booster"} (รายเดือน ฿259)`);
        params.set("metadata[payment_mode]", "one_time");
        params.set("success_url", `${origin}/merchant/finance?status=success&plan=${planCode}`);
        params.set("cancel_url", `${origin}/merchant/finance?status=cancelled`);
      } else {
        // Recurring Card Subscription or direct Card Payment
        if (plan.stripe_price_id) {
          params.set("mode", "subscription");
          params.set("payment_method_types[0]", "card");
          params.set("line_items[0][price]", plan.stripe_price_id);
          params.set("line_items[0][quantity]", "1");
          params.set("metadata[type]", "pro_booster_subscription");
          params.set("metadata[payment_mode]", "subscription");
          params.set("subscription_data[metadata][type]", "pro_booster_subscription");
          params.set("subscription_data[metadata][merchant_id]", merchantId);
          params.set("subscription_data[metadata][plan_code]", planCode);
          params.set("subscription_data[metadata][payment_method]", paymentMethod);
          params.set("success_url", `${origin}/merchant/finance?sub=success`);
          params.set("cancel_url", `${origin}/merchant/finance?status=cancelled`);
        } else {
          // Fallback to one-time card checkout if no Stripe Price ID configured yet
          params.set("mode", "payment");
          params.set("payment_method_types[0]", "card");
          params.set("line_items[0][quantity]", "1");
          params.set("line_items[0][price_data][currency]", "thb");
          params.set("line_items[0][price_data][unit_amount]", String(Math.round(planPrice * 100)));
          params.set("line_items[0][price_data][product_data][name]", `DEALDROP ${plan.name || "Pro Booster"} (รายเดือน ฿259)`);
          params.set("metadata[type]", "pro_booster_subscription");
          params.set("metadata[payment_mode]", "one_time");
          params.set("success_url", `${origin}/merchant/finance?status=success&plan=${planCode}`);
          params.set("cancel_url", `${origin}/merchant/finance?status=cancelled`);
        }
      }
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers,
      body: params,
    });
    const data: any = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "stripe error" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.url, session_id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
