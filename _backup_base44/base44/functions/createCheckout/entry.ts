/// <reference path="../../base44-env.d.ts" />
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

// Only these origins may be used for Stripe's post-payment redirects —
// anything else passed in the request body is an open-redirect vector.
const TRUSTED_ORIGINS = new Set(["https://hungry-quest-club.base44.app"]);
const FALLBACK_ORIGIN = "https://hungry-quest-club.base44.app";
const MIN_TOPUP = 100;
const MAX_TOPUP = 50000;
// Bonus credit granted on large top-ups (as advertised in the top-up modal).
const BONUS_THRESHOLD = 1000;
const BONUS_AMOUNT = 50;

export default async function(req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const merchantId = String(body?.merchant_id || "").trim();
    const checkoutType = String(body?.checkout_type || "").trim();
    const planCode = String(body?.plan_code || "").trim();
    const rawOrigin = String(body?.origin || FALLBACK_ORIGIN).trim();
    const origin = TRUSTED_ORIGINS.has(rawOrigin) ? rawOrigin : FALLBACK_ORIGIN;
    const paymentMethod = String(body?.payment_method || "card").trim();
    const email = String(body?.email || "").trim();
    const contactName = String(body?.contact_name || "").trim();
    if (!merchantId) return Response.json({ error: "merchant_id is required" }, { status: 400 });

    const appId = secrets.get("BASE44_APP_ID") || "";
    const headers = {
      Authorization: `Bearer ${secrets.get("STRIPE_SECRET_KEY")}`,
      "Stripe-Version": "2025-10-29.clover",
      "Idempotency-Key": crypto.randomUUID(),
    };

    const params = new URLSearchParams();
    params.set("metadata[base44_app_id]", appId);
    params.set("metadata[merchant_id]", merchantId);

    if (checkoutType === "wallet_topup") {
      // Case 1 — prepaid wallet top-up: one-time THB payment via Thai
      // PromptPay QR or debit/credit card. Credits the wallet on webhook.
      const amount = Number(body?.amount);
      if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
        return Response.json({ error: `amount must be between ${MIN_TOPUP} and ${MAX_TOPUP} THB` }, { status: 400 });
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
      // Case 2 — plan checkout: recurring card subscription (Pro Booster,
      // คอมมิชชันลดเหลือ 3%) or one-time PromptPay for a plan month.
      if (!planCode) return Response.json({ error: "plan_code is required" }, { status: 400 });
      const plans = await base44.asServiceRole.entities.SubscriptionPlan.filter({ code: planCode });
      const plan = plans[0];
      if (!plan) return Response.json({ error: "plan not found" }, { status: 404 });

      params.set("metadata[plan_code]", planCode);
      params.set("metadata[payment_method]", paymentMethod);
      if (contactName) params.set("metadata[contact_name]", contactName);
      if (email) params.set("customer_email", email);

      if (paymentMethod === "promptpay") {
        // PromptPay = สแกน QR ชำระครั้งเดียว (THB) ผ่าน Stripe — ไม่รองรับการหักเดือน
        params.set("mode", "payment");
        params.set("payment_method_types[0]", "promptpay");
        params.set("line_items[0][quantity]", "1");
        params.set("line_items[0][price_data][currency]", "thb");
        params.set("line_items[0][price_data][unit_amount]", String(plan.price * 100));
        params.set("line_items[0][price_data][product_data][name]", `DEALDROP ${plan.name} (รายเดือน)`);
        params.set("metadata[payment_mode]", "one_time");
        params.set("success_url", `${origin}/merchant/finance?status=success&plan=${planCode}`);
        params.set("cancel_url", `${origin}/merchant/finance?status=cancelled`);
      } else {
        // Recurring monthly card subscription — Pro Booster
        if (!plan.stripe_price_id) return Response.json({ error: "plan not configured for payment" }, { status: 500 });
        params.set("mode", "subscription");
        params.set("payment_method_types[0]", "card");
        params.set("line_items[0][price]", plan.stripe_price_id);
        params.set("line_items[0][quantity]", "1");
        params.set("metadata[type]", "pro_booster_subscription");
        params.set("metadata[payment_mode]", "subscription");
        params.set("subscription_data[metadata][base44_app_id]", appId);
        params.set("subscription_data[metadata][type]", "pro_booster_subscription");
        params.set("subscription_data[metadata][merchant_id]", merchantId);
        params.set("subscription_data[metadata][plan_code]", planCode);
        params.set("subscription_data[metadata][payment_method]", paymentMethod);
        params.set("success_url", `${origin}/merchant/finance?sub=success`);
        params.set("cancel_url", `${origin}/merchant/finance?status=cancelled`);
      }
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers, body: params });
    const data: any = await res.json();
    if (!res.ok) return Response.json({ error: data.error?.message || "stripe error" }, { status: 400 });
    return Response.json({ url: data.url, session_id: data.id });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}