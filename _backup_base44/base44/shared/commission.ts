// ============================================================
// Revenue engine shared helpers — used by verifyReceiptAI,
// calculateCommissionAndReward and generateMonthlySettlement.
// ============================================================

export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Take-rate split: the platform keeps `rate`% of the gross bill and
// absorbs the payment-gateway fee out of its own cut.
export function splitBill(gross, rate, gatewayRatePercent = 0) {
  const platform_fee = roundMoney(gross * (rate / 100));
  const gateway_fee = roundMoney(platform_fee * (gatewayRatePercent / 100));
  const net_merchant_amount = roundMoney(gross - platform_fee);
  return { platform_rate: rate, platform_fee, gateway_fee, net_merchant_amount };
}

// Effective commission rate for a merchant:
// active per-merchant config > platform-wide default > 5% fallback.
export async function resolveRate(base44, merchantId) {
  if (merchantId) {
    const configs = await base44.asServiceRole.entities.MerchantBillingConfig.filter(
      { merchant_id: merchantId },
      "-created_date",
      1
    );
    const cfg = configs[0];
    if (cfg && cfg.is_commission_active && typeof cfg.default_commission_rate === "number") {
      return cfg.default_commission_rate;
    }
  }
  const platform = await base44.asServiceRole.entities.PlatformConfig.list();
  const rate = platform[0]?.commission_percent;
  // Respect an explicit 0% (commission disabled platform-wide); only fall
  // back to 5% when no platform config record exists yet.
  return typeof rate === "number" ? rate : 5;
}

// XP reward from a real bill: 1 XP per 10 THB, capped at 500 per bill.
export function xpForBill(gross) {
  return Math.max(1, Math.min(500, Math.floor((Number(gross) || 0) / 10)));
}

// FoodieBuddy level curve: one level every 500 XP.
export function petLevelFromXp(xp) {
  return Math.max(1, Math.floor((Number(xp) || 0) / 500) + 1);
}

// Effective wallet-deduction commission rate for a merchant:
// Pro Booster (is_pro) gets 3%, an active discounted plan gets its plan rate,
// otherwise the merchant's base rate (default 6%). Shared by
// redeemCouponWithBill and completeTableOrder.
export async function resolveWalletCommissionRate(svc, merchant) {
  let rate = merchant.commission_rate != null ? merchant.commission_rate : 0.06;
  let proApplied = false;
  if (merchant.is_pro) {
    rate = 0.03;
    proApplied = true;
  } else if (merchant.active_plan_id) {
    const plan = await svc.entities.SubscriptionPlan.get(merchant.active_plan_id).catch(() => null);
    const subActive = !merchant.subscription_expires_at || new Date(merchant.subscription_expires_at) > new Date();
    if (plan && plan.discounted_commission_rate != null && subActive) {
      rate = plan.discounted_commission_rate;
      proApplied = true;
    }
  }
  return { rate, proApplied };
}