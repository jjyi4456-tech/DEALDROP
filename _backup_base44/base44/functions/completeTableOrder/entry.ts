import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { resolveWalletCommissionRate, roundMoney, xpForBill } from "../../shared/commission.ts";
import { grantGachaIngredient } from "../../shared/ingredients.ts";

// Auto-settlement for in-app table QR ordering: the merchant taps "Complete
// Order" on the kitchen board and the platform closes the bill, deducts its
// commission from the prepaid wallet, burns the linked coupon and rewards the
// customer. The bill is recomputed server-side from the stored order items,
// so amounts are always 100% accurate — no manual keying, no under-reporting.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.order_id || "");
    if (!orderId) {
      return Response.json({ error: "INVALID_PAYLOAD", message: "order_id is required" }, { status: 400 });
    }

    const order = await svc.entities.Order.get(orderId).catch(() => null);
    if (!order) return Response.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    if (order.merchant_owner_id !== user.id && user.role !== "admin") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (order.status === "completed" || order.status === "cancelled") {
      return Response.json({ error: "ORDER_ALREADY_CLOSED" }, { status: 409 });
    }

    // Bill accuracy: recompute the gross from the stored order items
    const gross = roundMoney((order.items || []).reduce(
      (s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0
    ));

    // Linked coupon: only percent/cash coupons are applied at table ordering;
    // an already-used/expired coupon silently falls back to no discount.
    let coupon = null;
    let discount = 0;
    let couponApplied = false;
    if (order.coupon_id) {
      coupon = await svc.entities.Coupon.get(order.coupon_id).catch(() => null);
      const today = new Date().toISOString().slice(0, 10);
      const usable = coupon
        && coupon.status === "available"
        && (!coupon.merchant_id || coupon.merchant_id === order.merchant_id)
        && (!coupon.expiry_date || coupon.expiry_date >= today)
        && ["percent", "cash"].includes(coupon.reward_type);
      if (usable) {
        const v = Number(coupon.reward_value) || 0;
        if (coupon.reward_type === "percent") discount = roundMoney(gross * v / 100);
        else discount = Math.min(v, gross);
        couponApplied = true;
      }
    }
    const netPaid = roundMoney(Math.max(0, gross - discount));

    const merchant = await svc.entities.Merchant.get(order.merchant_id).catch(() => null);
    if (!merchant) return Response.json({ error: "MERCHANT_NOT_FOUND" }, { status: 404 });

    // Commission: fee = net_paid * effective rate (Pro 3% / base 6%)
    const { rate, proApplied } = await resolveWalletCommissionRate(svc, merchant);
    const commissionFee = roundMoney(netPaid * rate);

    // Wallet + grace: one transaction may push the balance negative, then block
    const wallet = merchant.wallet_balance != null ? merchant.wallet_balance : 100;
    if (wallet < 0) {
      return Response.json(
        { error: "WALLET_EXHAUSTED", message: "กระเป๋าเงินติดลบ กรุณาเติมเครดิตก่อนปิดบิลถัดไป" },
        { status: 402 }
      );
    }
    const graceUsed = wallet < commissionFee;
    const balanceAfter = roundMoney(wallet - commissionFee);

    // 1) Close the order with the authoritative amounts
    await svc.entities.Order.update(orderId, {
      status: "completed",
      total_amount: gross,
      discount_amount: discount,
      net_paid: netPaid,
      commission_fee: commissionFee,
    });

    // 2) Burn the linked coupon
    if (coupon && couponApplied) {
      await svc.entities.Coupon.update(coupon.id, {
        status: "used",
        redeemed_date: new Date().toISOString().slice(0, 10),
      });
    }

    // 3) Deduct commission from the prepaid wallet
    await svc.entities.Merchant.update(order.merchant_id, {
      wallet_balance: balanceAfter,
      ...(proApplied && !merchant.is_pro ? { is_pro: true } : {}),
    });

    // 4) Ledger trail
    await base44.entities.MerchantLedger.create({
      merchant_id: order.merchant_id,
      merchant_name: merchant.name,
      merchant_owner_id: merchant.created_by_id,
      type: "commission_deduct",
      amount: -commissionFee,
      balance_after: balanceAfter,
      coupon_id: coupon?.id,
      bill_amount: gross,
      discount_amount: discount,
      final_customer_paid: netPaid,
      description: `หักค่าบริการอัตโนมัติจากออเดอร์ #${(orderId || "").slice(-6).toUpperCase()} (${order.table_no || "-"})${proApplied ? " (อัตรา Pro)" : ""}`,
    });

    // 5) Customer rewards: XP + gacha ingredient (never blocks settlement)
    let xp = 0;
    let drop = null;
    if (order.user_id) {
      xp = xpForBill(netPaid);
      const customer = await svc.entities.User.get(order.user_id).catch(() => null);
      if (customer) {
        await svc.entities.User.update(order.user_id, { xp: (customer.xp || 0) + xp });
      }
      try {
        drop = await grantGachaIngredient(svc, order.user_id);
      } catch { /* non-fatal */ }
    }

    return Response.json({
      ok: true,
      success: true,
      order_id: orderId,
      table_no: order.table_no,
      gross_amount: gross,
      discount_amount: discount,
      net_paid: netPaid,
      coupon_applied: couponApplied,
      commission_fee: commissionFee,
      commission_rate: rate,
      pro_applied: proApplied,
      grace_used: graceUsed,
      balance_after: balanceAfter,
      xp,
      drop,
    });
  } catch (error) {
    console.error("completeTableOrder error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}