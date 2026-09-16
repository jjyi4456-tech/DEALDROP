import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { roundMoney } from "../../shared/commission.ts";

// Monthly settlement: aggregates all SETTLED transactions of the previous
// month (Asia/Bangkok) per merchant into a SettlementBatch, then stamps the
// transactions with their batch id. Runs on the 1st of each month at 06:00
// via the "Monthly Settlement Report" workflow; an admin can also trigger a
// re-run from the Settlement Manager screen.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // When invoked by a logged-in user (admin dashboard button) require the
    // admin role; scheduled workflow invocations carry no user and pass.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (user && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // Default period = previous calendar month in Bangkok time.
    const nowParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date());
    const y = Number(nowParts.find((p) => p.type === "year").value);
    const m = Number(nowParts.find((p) => p.type === "month").value);
    const prevY = m === 1 ? y - 1 : y;
    const prevM = m === 1 ? 12 : m - 1;
    const lastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
    const periodStart = body.period_start || `${prevY}-${String(prevM).padStart(2, "0")}-01`;
    const periodEnd = body.period_end || `${prevY}-${String(prevM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // All settled bills not yet attached to a batch.
    const txs = await base44.asServiceRole.entities.Transaction.filter(
      { status: "settled" },
      "-transaction_date",
      500
    );
    const candidates = txs.filter(
      (t) =>
        t.merchant_id &&
        !t.settlement_batch_id &&
        t.transaction_date >= periodStart &&
        t.transaction_date <= periodEnd
    );

    // Skip merchants that already have a batch for this exact period
    // (idempotent re-runs).
    const existing = await base44.asServiceRole.entities.SettlementBatch.filter(
      { period_start: periodStart },
      "-created_date",
      500
    );
    const existingMerchants = new Set(existing.map((b) => b.merchant_id));

    // Group by merchant.
    const byMerchant = new Map();
    for (const t of candidates) {
      if (existingMerchants.has(t.merchant_id)) continue;
      if (!byMerchant.has(t.merchant_id)) {
        byMerchant.set(t.merchant_id, {
          merchant_id: t.merchant_id,
          merchant_name: t.merchant_name || "",
          merchant_owner_id: t.merchant_owner_id || null,
          transactions: [],
        });
      }
      byMerchant.get(t.merchant_id).transactions.push(t);
    }

    const batches = [];
    const stampIds = [];
    for (const grp of byMerchant.values()) {
      const totalGmv = roundMoney(grp.transactions.reduce((s, t) => s + (Number(t.gross_amount) || 0), 0));
      const totalCommission = roundMoney(
        grp.transactions.reduce((s, t) => s + (Number(t.platform_fee) || 0), 0)
      );
      const batch = await base44.asServiceRole.entities.SettlementBatch.create({
        merchant_id: grp.merchant_id,
        merchant_name: grp.merchant_name,
        merchant_owner_id: grp.merchant_owner_id,
        period_start: periodStart,
        period_end: periodEnd,
        total_gmv: totalGmv,
        total_commission: totalCommission,
        net_payout: roundMoney(totalGmv - totalCommission),
        transaction_count: grp.transactions.length,
        payout_status: "pending",
      });
      batches.push({
        batch_id: batch.id,
        merchant_name: grp.merchant_name,
        total_gmv: totalGmv,
        total_commission: totalCommission,
        net_payout: roundMoney(totalGmv - totalCommission),
        transactions: grp.transactions.length,
      });
      for (const t of grp.transactions) stampIds.push({ id: t.id, settlement_batch_id: batch.id });
    }

    if (stampIds.length > 0) {
      await base44.asServiceRole.entities.Transaction.bulkUpdate(stampIds);
    }

    return Response.json({
      period_start: periodStart,
      period_end: periodEnd,
      batches_created: batches.length,
      transactions_settled: stampIds.length,
      batches,
    });
  } catch (error) {
    console.error("generateMonthlySettlement error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}