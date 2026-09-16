import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { haversineMeters } from "../../shared/geo.ts";

// "Squad กินแหลก" check-in: validates the caller is a squad member and is
// physically at the shop (geofence), records their check-in, and creates a
// real CheckIn with the squad's 3x XP bonus (feeds leaderboard + hotpot).
// When the last member checks in, marks the squad completed and grants every
// member the big reward coupon. Idempotent per user.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const squadId = body?.squad_id;
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!squadId || !isFinite(lat) || !isFinite(lng)) {
      return Response.json({ error: "squad_id, lat, lng required" }, { status: 400 });
    }

    const squad = await base44.asServiceRole.entities.Squad.get(squadId).catch(() => null);
    if (!squad) return Response.json({ error: "ไม่พบ Squad" }, { status: 404 });

    const members = squad.members || [];
    if (!members.includes(user.id)) return Response.json({ error: "คุณไม่ได้เป็นสมาชิก Squad นี้" }, { status: 403 });
    if (squad.status === "completed") return Response.json({ ok: true, already_completed: true, status: "completed" });
    if (squad.status === "expired") return Response.json({ error: "Squad หมดอายุแล้ว" }, { status: 400 });

    // Geofence validation against the shop
    const merchant = await base44.asServiceRole.entities.Merchant.get(squad.merchant_id).catch(() => null);
    if (!merchant || !merchant.lat || !merchant.lng) {
      return Response.json({ error: "ร้านค้านี้ยังไม่ได้ตั้งพิกัด" }, { status: 400 });
    }
    const dist = haversineMeters(lat, lng, merchant.lat, merchant.lng);
    const radius = merchant.geofence_radius || 50;
    if (dist > radius) {
      return Response.json({ error: `อยู่ห่างจากร้าน ${Math.round(dist)}ม. ต้องอยู่ในรัศมี ${radius}ม. จึงจะเช็คอินได้` }, { status: 400 });
    }

    // Record this member's check-in (idempotent)
    let checkedIn = squad.checked_in || [];
    if (!checkedIn.includes(user.id)) {
      checkedIn = [...checkedIn, user.id];
    }

    // Create a real CheckIn with the squad 3x XP bonus — feeds leaderboard + hotpot
    const quest = await base44.asServiceRole.entities.Quest.get(squad.quest_id).catch(() => null);
    const xpBonus = (quest?.xp_reward || 50) * 3;
    await base44.asServiceRole.entities.CheckIn.create({
      user_id: user.id,
      merchant_id: squad.merchant_id,
      merchant_name: squad.merchant_name,
      merchant_owner_id: merchant.created_by_id,
      quest_id: squad.quest_id,
      xp_earned: xpBonus,
      lat,
      lng,
    });

    // Completion: every member has checked in
    let status = squad.status;
    let completedNow = false;
    if (checkedIn.length >= squad.required_count && members.every((m) => checkedIn.includes(m))) {
      status = "completed";
      completedNow = true;
    }
    await base44.asServiceRole.entities.Squad.update(squad.id, { checked_in: checkedIn, status });

    // On completion: grant the big reward coupon to every member
    let reward = null;
    if (completedNow) {
      const expiry = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      for (const mId of members) {
        await base44.asServiceRole.entities.Coupon.create({
          user_id: mId,
          merchant_id: squad.merchant_id,
          merchant_name: squad.merchant_name,
          quest_id: squad.quest_id,
          title: squad.reward_title || "รางวัล Squad กินแหลก",
          reward_type: squad.reward_type || "menu",
          reward_value: squad.reward_value || "ฟรีเมนูทานเล่น",
          status: "available",
          qr_code: `SQUAD-${squad.squad_code}`,
          expiry_date: expiry,
        });
      }
      reward = { title: squad.reward_title, value: squad.reward_value, xp: xpBonus };
    }

    return Response.json({
      ok: true,
      checked_in: checkedIn,
      required: squad.required_count,
      status,
      completedNow,
      reward,
      xp_earned: xpBonus,
    });
  } catch (error) {
    console.error("squadCheckIn error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}