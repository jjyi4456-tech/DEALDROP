import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Merchant prepaid wallet top-up. Payment is handled via Thai PromptPay QR
// at the counter; while the payment gateway is in test mode this endpoint
// confirms the top-up automatically (mock top-up) and credits the wallet.

const MIN_TOPUP = 100;
const MAX_TOPUP = 50000;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const merchantId = String(body?.merchant_id || "");
    const amount = Number(body?.amount);
    if (!merchantId || !Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
      return Response.json(
        { error: "INVALID_AMOUNT", message: `จำนวนเติมเงินต้องอยู่ระหว่าง ฿${MIN_TOPUP} - ฿${MAX_TOPUP}` },
        { status: 400 }
      );
    }

    const merchant = await svc.entities.Merchant.get(merchantId).catch(() => null);
    if (!merchant) return Response.json({ error: "MERCHANT_NOT_FOUND" }, { status: 404 });
    if (merchant.created_by_id !== user.id && user.role !== "admin") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const wallet = merchant.wallet_balance != null ? merchant.wallet_balance : 100;
    const balanceAfter = Math.round((wallet + amount) * 100) / 100;

    await svc.entities.Merchant.update(merchantId, { wallet_balance: balanceAfter });
    await base44.entities.MerchantLedger.create({
      merchant_id: merchantId,
      merchant_name: merchant.name,
      merchant_owner_id: merchant.created_by_id,
      type: "topup",
      amount,
      balance_after: balanceAfter,
      description: `เติมเครดิต ฿${amount} (PromptPay QR — โหมดทดสอบ: ยืนยันการชำระอัตโนมัติ)`,
    });

    return Response.json({ ok: true, amount, balance_after: balanceAfter });
  } catch (error) {
    console.error("topupMerchantWallet error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}