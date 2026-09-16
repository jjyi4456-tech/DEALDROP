import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { resolveWalletCommissionRate } from "../../shared/commission.ts";
import { grantGachaIngredient } from "../../shared/ingredients.ts";

// Pay-per-Success redemption: the cashier confirms the real bill, the platform
// takes its commission from the merchant's prepaid wallet, and the customer
// gets XP + a gacha ingredient. One negative-balance transaction is allowed
// as a grace period; after that redemption is blocked until a top-up.

const REDEEM_XP = 50;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const couponCode = String(body?.coupon_code || "").trim();
    const billAmount = Number(body?.bill_amount);
    const merchantId = String(body?.merchant_id || "");
    const storyShared = body?.story_shared === true;
    if (!couponCode || !merchantId || !Number.isFinite(billAmount) || billAmount <= 0) {
      return Response.json({ error: "INVALID_PAYLOAD", message: "coupon_code, merchant_id, bill_amount are required" }, { status: 400 });
    }

    const merchant = await svc.entities.Merchant.get(merchantId).catch(() => null);
    if (!merchant) return Response.json({ error: "MERCHANT_NOT_FOUND" }, { status: 404 });
    if (merchant.created_by_id !== user.id && user.role !== "admin") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    // Coupon must exist, belong to this shop, and still be redeemable
    const coupons = await svc.entities.Coupon.filter({ qr_code: couponCode }, "-created_date", 5);
    const coupon = coupons?.[0] || null;
    if (!coupon) return Response.json({ error: "COUPON_NOT_FOUND" }, { status: 404 });
    if (coupon.merchant_id && coupon.merchant_id !== merchantId) {
      return Response.json({ error: "COUPON_WRONG_SHOP" }, { status: 403 });
    }
    if (coupon.status === "used") return Response.json({ error: "COUPON_ALREADY_USED" }, { status: 409 });
    if (coupon.status === "expired") return Response.json({ error: "COUPON_EXPIRED" }, { status: 409 });
    const today = new Date().toISOString().slice(0, 10);
    if (coupon.expiry_date && coupon.expiry_date < today) {
      return Response.json({ error: "COUPON_EXPIRED" }, { status: 409 });
    }

    // Commission rate: Pro Booster gets 3%, else the shop's base rate
    const { rate, proApplied } = await resolveWalletCommissionRate(svc, merchant);

    // Bill math: gross -> coupon discount -> net the customer pays
    const rewardValue = Number(coupon.reward_value) || 0;
    let discount = 0;
    if (coupon.reward_type === "percent") discount = (billAmount * rewardValue) / 100;
    else if (coupon.reward_type === "cash") discount = Math.min(rewardValue, billAmount);
    discount = Math.round(discount * 100) / 100;
    // 📸 Story Boost: cashier-confirmed IG/TikTok story tag → extra discount
    const boostPct = storyShared && merchant.story_boost_enabled
      ? (merchant.story_boost_percent != null ? merchant.story_boost_percent : 5)
      : 0;
    const storyBonus = boostPct > 0 ? Math.round((billAmount * boostPct) / 100 * 100) / 100 : 0;
    const storyApplied = storyBonus > 0;
    const finalPaid = Math.max(0, Math.round((billAmount - discount - storyBonus) * 100) / 100);
    const commissionFee = Math.round(finalPaid * rate * 100) / 100;

    // Wallet + grace: one transaction may push the balance negative, then block
    const wallet = merchant.wallet_balance != null ? merchant.wallet_balance : 100;
    if (wallet < 0) {
      return Response.json(
        { error: "WALLET_EXHAUSTED", message: "กระเป๋าเงินติดลบ กรุณาเติมเครดิตก่อนรับคูปองถัดไป" },
        { status: 402 }
      );
    }
    const graceUsed = wallet < commissionFee;
    const balanceAfter = Math.round((wallet - commissionFee) * 100) / 100;

    // Burn the coupon + deduct the wallet atomically-ish (sequential, verified)
    await svc.entities.Coupon.update(coupon.id, { status: "used", redeemed_date: today });
    await svc.entities.Merchant.update(merchantId, {
      wallet_balance: balanceAfter,
      // keep is_pro in sync when a discounted plan resolves to Pro pricing
      ...(proApplied && !merchant.is_pro ? { is_pro: true } : {}),
    });

    await base44.entities.MerchantLedger.create({
      merchant_id: merchantId,
      merchant_name: merchant.name,
      merchant_owner_id: merchant.created_by_id,
      type: "commission_deduct",
      amount: -commissionFee,
      balance_after: balanceAfter,
      coupon_id: coupon.id,
      bill_amount: billAmount,
      discount_amount: discount,
      final_customer_paid: finalPaid,
      story_shared: storyApplied,
      description: (graceUsed
        ? `ตัดค่าคอมมิชชัน ${rate * 100}% จากยอดสุทธิ ฿${finalPaid} (Grace: เครดิตไม่พอ กรุณาเติมเงิน)`
        : `ตัดค่าคอมมิชชัน ${rate * 100}% จากยอดสุทธิ ฿${finalPaid}${proApplied ? " (อัตรา Pro)" : ""}`) + (storyApplied ? ` · 📸 โบนัสสตอรี่ -฿${storyBonus}` : ""),
    });

    // Customer rewards: XP + one gacha ingredient (never blocks redemption)
    let drop = null;
    if (coupon.user_id) {
      const customer = await svc.entities.User.get(coupon.user_id).catch(() => null);
      if (customer) {
        await svc.entities.User.update(coupon.user_id, {
          xp: (customer.xp || 0) + REDEEM_XP,
          total_checkins: customer.total_checkins || 0,
        });
      }
      try {
        drop = await grantGachaIngredient(svc, coupon.user_id);
      } catch { /* non-fatal */ }
    }

    // 🎁 Bounce-Back Mystery Voucher: instant 7-day coupon for the SAME shop,
    // handed to the customer right after a successful bill close.
    let new_bounce_coupon = null;
    if (coupon.user_id) {
      try {
        const bounceExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        new_bounce_coupon = await svc.entities.Coupon.create({
          user_id: coupon.user_id,
          merchant_id: merchantId,
          merchant_name: merchant.name,
          title: "🎁 ของขวัญมื้อถัดไป: ลด 15% สำหรับคุณ",
          reward_type: "percent",
          reward_value: "15",
          coupon_type: "bounce_back",
          status: "available",
          qr_code: `CPN-BB-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`,
          expires_at: bounceExpiresAt,
          expiry_date: bounceExpiresAt.slice(0, 10),
          box_opened: false,
        });
      } catch (e) {
        console.error("bounce-back coupon error:", e?.message || e);
      }
    }

    return Response.json({
      ok: true,
      success: true,
      new_bounce_coupon,
      final_paid: finalPaid,
      fee_deducted: commissionFee,
      remaining_balance: balanceAfter,
      bill_amount: billAmount,
      discount_amount: discount,
      story_bonus: storyBonus,
      story_shared: storyApplied,
      final_paid_amount: finalPaid,
      commission_fee: commissionFee,
      commission_rate: rate,
      pro_applied: proApplied,
      grace_used: graceUsed,
      balance_after: balanceAfter,
      xp: REDEEM_XP,
      drop,
    });
  } catch (error) {
    console.error("redeemCouponWithBill error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}