import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Community Co-op Hotpot (หม้อไฟรวมพลัง).
// Triggered by the "Hotpot Bump" workflow on every CheckIn "create".
// 1. Denormalizes the shop owner onto the CheckIn (merchant_owner_id) so RLS can
//    restrict merchants to check-ins at their own shop only.
// 2. Bumps the active campaign's temperature (current_count) by +1 — the
//    running total lives on the GlobalGoal record (a "global variable") so the
//    Home screen reads one number instead of counting all check-ins.
// 3. When the target is reached, marks the campaign completed and distributes a
//    Mega Reward (stored separately from normal coupons) to every user who
//    participated during the campaign window. Idempotent against duplicate runs.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const checkinId = body.checkin_id;
    if (!checkinId) return Response.json({ error: "checkin_id required" }, { status: 400 });

    // 1. Load the check-in + denormalize the shop owner for RLS.
    let checkin: any = null;
    try { checkin = await sr.entities.CheckIn.get(checkinId); } catch { /* not found */ }
    if (!checkin) return Response.json({ error: "checkin not found" }, { status: 404 });

    let ownerSet = false;
    if (checkin.merchant_id) {
      try {
        const merchant = await sr.entities.Merchant.get(checkin.merchant_id);
        if (merchant && merchant.created_by_id && checkin.merchant_owner_id !== merchant.created_by_id) {
          await sr.entities.CheckIn.update(checkinId, { merchant_owner_id: merchant.created_by_id });
          ownerSet = true;
        }
      } catch { /* ignore */ }
    }

    // 2. Find the active campaign whose date window contains today (Bangkok).
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()); // YYYY-MM-DD
    const goals = await sr.entities.GlobalGoal.filter({ status: "active" }, "-created_date", 50);
    const goal = goals.find((g: any) => g.start_date && g.end_date && today >= g.start_date && today <= g.end_date) || null;

    if (!goal) {
      return Response.json({ bumped: false, reason: "no_active_campaign", owner_set: ownerSet });
    }

    // 3. Atomically bump the temperature (server-side only — prevents client tampering).
    await sr.entities.GlobalGoal.updateMany({ id: goal.id }, { $inc: { current_count: 1 } });

    // 4. Re-read; if the target is reached, complete + distribute Mega Rewards.
    const updated: any = await sr.entities.GlobalGoal.get(goal.id);
    let completed = false;
    let awarded = 0;

    if ((updated.current_count || 0) >= (updated.target_count || 0) && updated.status === "active") {
      try {
        await sr.entities.GlobalGoal.updateMany(
          { id: goal.id, status: "active" },
          { $set: { status: "completed", completed_date: new Date().toISOString() } }
        );
        completed = true;
      } catch { /* race: another invocation already flipped the status */ }

      // Everyone who checked in during the campaign window earns the Mega Reward.
      const startMs = new Date(updated.start_date + "T00:00:00+07:00").getTime();
      const endMs = new Date(updated.end_date + "T23:59:59+07:00").getTime();
      const recent = await sr.entities.CheckIn.filter({}, "-created_date", 2000);
      const userIds = new Set<string>();
      for (const c of recent) {
        const t = new Date(c.created_date).getTime();
        if (isNaN(t)) continue;
        if (t >= startMs && t <= endMs && c.user_id) userIds.add(c.user_id);
      }

      // Idempotent: skip users who already hold a MegaReward for this goal.
      const existing = await sr.entities.MegaReward.filter({ goal_id: goal.id }, undefined, 500);
      const have = new Set(existing.map((r: any) => r.user_id));
      const awardDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
      for (const uid of userIds) {
        if (have.has(uid)) continue;
        try {
          await sr.entities.MegaReward.create({
            user_id: uid,
            goal_id: goal.id,
            goal_title: updated.title,
            title: updated.mega_reward_title || "Mega Reward หม้อไฟรวมพลัง",
            reward_type: updated.mega_reward_type || "percent",
            reward_value: String(updated.mega_reward_value || "10"),
            status: "available",
            awarded_date: awardDate,
          });
          awarded++;
        } catch { /* ignore individual failures */ }
      }
    }

    return Response.json({
      bumped: true,
      goal_id: goal.id,
      current_count: updated.current_count,
      target_count: updated.target_count,
      completed,
      awarded,
      owner_set: ownerSet,
    });
  } catch (error) {
    console.error("bumpHotpot error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}