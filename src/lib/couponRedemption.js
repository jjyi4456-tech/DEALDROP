import { base44 } from "@/api/base44Client";

/**
 * Redeem coupon with bill calculation and ledger tracking.
 */
export async function redeemCouponWithBillDirect({
  coupon_code,
  bill_amount,
  merchant_id,
  story_shared = false,
}) {
  if (!coupon_code) throw new Error("coupon_code is required");
  if (!bill_amount || Number(bill_amount) <= 0) throw new Error("bill_amount must be positive");

  // 1. Find coupon
  const coupons = await base44.entities.Coupon.filter({ qr_code: coupon_code.trim() }, null, 1);
  if (!coupons || coupons.length === 0) {
    const err = new Error("ไม่พบคูปองนี้ในระบบ");
    err.data = { error: "COUPON_NOT_FOUND" };
    throw err;
  }

  const coupon = coupons[0];
  if (coupon.status === "used") {
    const err = new Error("คูปองนี้ถูกใช้งานแล้ว");
    err.data = { error: "COUPON_ALREADY_USED" };
    throw err;
  }

  // 2. Find merchant
  const merchant = await base44.entities.Merchant.get(merchant_id || coupon.merchant_id);
  if (!merchant) {
    throw new Error("ไม่พบข้อมูลร้านค้า");
  }

  // Check if wallet is exhausted (negative or below allowed limit)
  const currentBalance = Number(merchant.wallet_balance) || 0;
  if (currentBalance < -500) {
    const err = new Error("ยอดเงินในกระเป๋าติดลบเกินกำหนด กรุณาเติมเครดิตก่อนรับคูปอง");
    err.data = { error: "WALLET_EXHAUSTED" };
    throw err;
  }

  // Calculate commission
  const rate = merchant.is_pro
    ? 0.03
    : merchant.commission_rate != null
      ? Number(merchant.commission_rate)
      : 0.06;

  const grossBill = Number(bill_amount);
  const commissionFee = Math.round(grossBill * rate * 100) / 100;
  const newBalance = Math.round((currentBalance - commissionFee) * 100) / 100;
  const todayIso = new Date().toISOString().slice(0, 10);

  // 3. Update coupon
  await base44.entities.Coupon.update(coupon.id, {
    status: "used",
    redeemed_date: todayIso,
    bill_amount: grossBill,
    commission_fee: commissionFee,
  });

  // 4. Update merchant wallet balance
  await base44.entities.Merchant.update(merchant.id, {
    wallet_balance: newBalance,
  });

  // 5. Create audit ledger
  await base44.entities.MerchantLedger.create({
    merchant_id: merchant.id,
    merchant_name: merchant.name,
    merchant_owner_id: merchant.created_by_id,
    type: "fee_deduction",
    amount: -commissionFee,
    balance_after: newBalance,
    reference_id: coupon.id,
    description: `หักคอมมิชชันสแกนคูปอง ${coupon.qr_code} (ยอดบิล ฿${grossBill.toLocaleString()})`,
  }).catch((err) => console.warn("Ledger insert warning:", err));

  // 6. Give user XP and bonus if story shared
  if (coupon.user_id) {
    const user = await base44.entities.User.get(coupon.user_id).catch(() => null);
    if (user) {
      const bonusXp = story_shared ? 50 : 25;
      await base44.entities.User.update(coupon.user_id, {
        xp: (Number(user.xp) || 0) + bonusXp,
        total_checkins: (Number(user.total_checkins) || 0) + 1,
      }).catch(() => {});
    }
  }

  return {
    success: true,
    coupon_id: coupon.id,
    bill_amount: grossBill,
    commission_fee: commissionFee,
    balance_after: newBalance,
  };
}
