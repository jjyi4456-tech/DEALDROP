import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { splitBill, resolveRate, xpForBill, petLevelFromXp } from "../../shared/commission.ts";

// Finalises a VERIFIED bill: recalculates the take-rate split, marks the
// Transaction as settled, and rewards the user (pet XP) based on the real
// bill amount. Called when an admin approves/queues a bill for payout.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.transaction_id) {
      return Response.json({ error: "ต้องระบุ transaction_id" }, { status: 400 });
    }

    // Only the bill owner or an admin can settle a transaction.
    if (user.role !== "admin") {
      const mine = await base44.entities.Transaction.filter({ id: body.transaction_id }, "-created_date", 1);
      if (!mine[0] || mine[0].user_id !== user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const txs = await base44.asServiceRole.entities.Transaction.filter({ id: body.transaction_id }, "-created_date", 1);
    const tx = txs[0];
    if (!tx) return Response.json({ error: "ไม่พบธุรกรรมนี้" }, { status: 404 });
    if (tx.status !== "verified") {
      return Response.json({ error: "ธุรกรรมนี้ยังไม่ผ่านการตรวจสอบ (ต้องอยู่ในสถานะ verified)" }, { status: 400 });
    }

    // Re-run the split with the merchant's current rate so the settlement
    // always reflects the latest commission configuration.
    const rate = await resolveRate(base44, tx.merchant_id);
    const gross = Number(tx.gross_amount) || 0;
    const split = splitBill(gross, rate);

    await base44.asServiceRole.entities.Transaction.update(tx.id, {
      platform_rate: split.platform_rate,
      platform_fee: split.platform_fee,
      gateway_fee: split.gateway_fee,
      net_merchant_amount: split.net_merchant_amount,
      status: "settled",
    });

    // Reward: pet XP proportional to the real bill (1 XP / 10 THB, max 500).
    const xpAward = xpForBill(gross);
    let pet = null;
    if (tx.user_id) {
      const pets = await base44.asServiceRole.entities.FoodieBuddy.filter(
        { user_id: tx.user_id },
        "-created_date",
        1
      );
      pet = pets[0] || null;
      if (pet) {
        const newXp = (Number(pet.xp) || 0) + xpAward;
        await base44.asServiceRole.entities.FoodieBuddy.update(pet.id, {
          xp: newXp,
          level: petLevelFromXp(newXp),
          happiness: Math.min(100, (Number(pet.happiness) || 0) + 10),
        });
      }
    }

    return Response.json({
      transaction_id: tx.id,
      status: "settled",
      gross_amount: gross,
      platform_fee: split.platform_fee,
      net_merchant_amount: split.net_merchant_amount,
      xp_awarded: pet ? xpAward : 0,
      pet_level: pet ? petLevelFromXp((Number(pet.xp) || 0) + xpAward) : null,
    });
  } catch (error) {
    console.error("calculateCommissionAndReward error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}