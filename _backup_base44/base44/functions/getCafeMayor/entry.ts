import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { mayorBadgeKey, addMayorBadge, removeMayorBadge } from "../../shared/cafeMayor.ts";

// First instant of the current month in Bangkok time, as a UTC ISO string
// (used as the $gte cutoff when filtering CheckIn.created_date).
function bangkokMonthStartISO(): string {
  const [y, m] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).format(new Date()).split("-"); // YYYY-MM
  return new Date(`${y}-${m}-01T00:00:00+07:00`).toISOString();
}

function bangkokMonthKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).format(new Date()); // YYYY-MM
}

// Computes the current month's "Cafe Mayor" (top check-in user) for a merchant.
// On a mayor change it: (1) pushes the former mayor to come back, (2) re-awards
// the mayor badge, (3) persists the new mayor snapshot on the Merchant record.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const merchantId = body.merchant_id;
    if (!merchantId) return Response.json({ error: "merchant_id required" }, { status: 400 });

    const sr = base44.asServiceRole;
    const cutoff = bangkokMonthStartISO();
    const month = bangkokMonthKey();

    let merchant: any = null;
    try { merchant = await sr.entities.Merchant.get(merchantId); } catch { /* not found */ }
    if (!merchant) return Response.json({ error: "merchant not found" }, { status: 404 });

    // Aggregate this month's check-ins for the merchant by user.
    // NOTE: the SDK filter operator on the system `created_date` field does not
    // match reliably, so we fetch the merchant's most-recent check-ins (sorted
    // desc) and filter by month in JS.
    const recent = await sr.entities.CheckIn.filter(
      { merchant_id: merchantId },
      "-created_date",
      2000
    );
    const cutoffMs = new Date(cutoff).getTime();
    const checkins: any[] = [];
    for (const c of recent) {
      const t = new Date(c.created_date).getTime();
      if (isNaN(t)) continue;
      if (t >= cutoffMs) checkins.push(c);
      else break; // sorted desc → stop at the first record before this month
    }
    const counts: Record<string, number> = {};
    for (const c of checkins) {
      if (!c.user_id) continue;
      counts[c.user_id] = (counts[c.user_id] || 0) + 1;
    }
    const ids = Object.keys(counts);
    const entries = ids.map((id) => ({ id, count: counts[id] }));
    entries.sort((a, b) => b.count - a.count);

    // Resolve names/avatars for the participants.
    const um: Record<string, any> = {};
    if (ids.length) {
      const users = await sr.entities.User.filter({ id: { $in: ids } }, undefined, 100);
      users.forEach((u: any) => { um[u.id] = u; });
    }

    const top = entries.slice(0, 5).map((e, i) => ({
      rank: i + 1,
      user_id: e.id,
      name: um[e.id]?.full_name || "นักชิม",
      avatar: um[e.id]?.avatar,
      count: e.count,
      is_me: e.id === user.id,
    }));

    const myCount = counts[user.id] || 0;
    let myRank: number | null = null;
    if (myCount > 0) myRank = entries.findIndex((e) => e.id === user.id) + 1;

    const mayor = top[0]
      ? { user_id: top[0].user_id, name: top[0].name, avatar: top[0].avatar, count: top[0].count, is_me: top[0].is_me }
      : null;

    // --- Mayor change detection + side effects ---
    let changed = false;
    let notified = 0;
    const prevMayorId = merchant.current_mayor_user_id || null;
    const newMayorId = mayor ? mayor.user_id : null;

    if (newMayorId && newMayorId !== prevMayorId) {
      const wasDethronement = !!prevMayorId;
      changed = wasDethronement;

      if (wasDethronement) {
        // Nudge the former mayor to come back and reclaim the throne.
        try {
          await sr.integrations.Core.SendPushNotification({
            user_id: prevMayorId,
            title: "👑 เจ้าถิ่นของร้านเปลี่ยนไปแล้ว!",
            content: `ใครบางคนแซงคุณเป็นเจ้าถิ่นประจำร้าน ${merchant.name || ""} รีบกลับมาเช็คอินชิงบัลลังก์คืน!`,
            action_label: "ชิงเจ้าถิ่นคืน",
            action_url: `/user/merchant/${merchantId}`,
          });
          notified = 1;
        } catch { /* push requires a native mobile build; ignore if unavailable */ }
        try { await removeMayorBadge(sr, prevMayorId, merchantId); } catch { /* ignore */ }
      }

      // Crown the new mayor.
      try { await addMayorBadge(sr, newMayorId, merchantId); } catch { /* ignore */ }

      // Persist the new mayor snapshot.
      try {
        await sr.entities.Merchant.update(merchantId, {
          current_mayor_user_id: newMayorId,
          current_mayor_count: mayor.count,
          mayor_updated_date: new Date().toISOString(),
        });
      } catch { /* ignore */ }
    } else if (newMayorId && newMayorId === prevMayorId && mayor.count !== (merchant.current_mayor_count || 0)) {
      // Same mayor, count grew — keep the snapshot in sync.
      try { await sr.entities.Merchant.update(merchantId, { current_mayor_count: mayor.count }); } catch { /* ignore */ }
    }

    return Response.json({
      merchant_id: merchantId,
      merchant_name: merchant.name,
      month,
      mayor,
      top,
      my_count: myCount,
      my_rank: myRank,
      changed,
      notified,
    });
  } catch (error) {
    console.error("getCafeMayor error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}