import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";

async function verifyStripeSignature(raw, sigHeader, secret) {
  if (!sigHeader || !secret) return null;
  const parts = {};
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
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${raw}`));
  const expected = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected !== v1) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sig = req.headers.get("stripe-signature");
    const raw = await req.text();
    const event = await verifyStripeSignature(raw, sig, secrets.get("STRIPE_WEBHOOK_SECRET"));
    if (!event) return Response.json({ error: "invalid signature" }, { status: 400 });

    const upgradeMerchant = async (merchantId, planCode, paymentMode) => {
      if (!merchantId || !planCode) return;
      const plans = await base44.asServiceRole.entities.SubscriptionPlan.filter({ code: planCode });
      const plan = plans[0];
      const update = { tier: planCode };
      if (plan) {
        update.quest_quota = plan.quest_quota;
        update.push_quota = plan.push_quota;
        update.geofence_radius = plan.geofence_radius;
      }
      if (paymentMode === "one_time") {
        update.subscription_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      await base44.asServiceRole.entities.Merchant.update(merchantId, update);
    };

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const meta = session.metadata || {};
      if (meta.type === "wallet_topup") {
        // Top-up สำเร็จ → เติมเครดิตเข้ากระเป๋าร้านและบันทึก Statement
        const merchantId = meta.merchant_id;
        const addedAmount = Number(meta.topup_amount);
        if (merchantId && addedAmount > 0) {
          const merchant = await base44.asServiceRole.entities.Merchant.get(merchantId);
          const newBalance = (merchant?.wallet_balance || 0) + addedAmount;
          await base44.asServiceRole.entities.Merchant.update(merchantId, { wallet_balance: newBalance });
          await base44.asServiceRole.entities.MerchantLedger.create({
            merchant_id: merchantId,
            merchant_name: merchant?.name,
            merchant_owner_id: merchant?.created_by_id,
            type: "topup",
            amount: addedAmount,
            balance_after: newBalance,
            description: "เติมเงินผ่าน Stripe PromptPay/Card สำเร็จ",
          });
        }
      } else {
        await upgradeMerchant(meta.merchant_id, meta.plan_code, meta.payment_mode);
        if (meta.type === "pro_booster_subscription" && meta.merchant_id) {
          // สมัคร Pro Booster สำเร็จ → ลดค่าคอมมิชชันเหลือ 3%
          await base44.asServiceRole.entities.Merchant.update(meta.merchant_id, {
            is_pro: true,
            commission_rate: 0.03,
            stripe_subscription_id: session.subscription,
          });
        }
      }
    } else if (event.type === "customer.subscription.deleted") {
      const meta = event.data?.object?.metadata || {};
      if (meta.merchant_id) {
        await base44.asServiceRole.entities.Merchant.update(meta.merchant_id, { tier: "starter" });
      }
    }
    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}