import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { removeMayorBadge } from "../../shared/cafeMayor.ts";

// Monthly reset of the "Cafe Mayor" stats. Runs on the 1st of each month
// (00:00 Bangkok) via the "Cafe Mayor Monthly Reset" scheduled workflow.
// For every merchant that currently has a mayor: clears the stored mayor
// snapshot (current_mayor_user_id / count / updated_date) and removes the
// per-merchant mayor badge from the outgoing mayor — so the new month starts
// fresh and the first check-ins re-elect a mayor without a false "dethrone".
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const merchants = await sr.entities.Merchant.filter({}, "-created_date", 500);
    let reset = 0;
    let badgeCleared = 0;
    for (const m of merchants) {
      if (!m.current_mayor_user_id) continue;
      try { await removeMayorBadge(sr, m.current_mayor_user_id, m.id); badgeCleared++; } catch { /* ignore */ }
      try {
        await sr.entities.Merchant.update(m.id, {
          current_mayor_user_id: null,
          current_mayor_count: 0,
          mayor_updated_date: null,
        });
      } catch { /* ignore */ }
      reset++;
    }
    return Response.json({ reset, badge_cleared: badgeCleared, month_ended: true });
  } catch (error) {
    console.error("resetCafeMayorMonthly error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}