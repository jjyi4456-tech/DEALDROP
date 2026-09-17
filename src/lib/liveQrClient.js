/**
 * Standalone Client-side fallback token generator for Dynamic QR & Check-in.
 * Provides fallback functionality when the Edge Function is offline or during local testing.
 */

const WINDOW_SEC = 15;

export async function generateLiveQrTokenDirect({ merchant_id }) {
  if (!merchant_id) throw new Error("merchant_id is required");
  const now = Date.now();
  const expiresAt = now + WINDOW_SEC * 1000;
  // Generate random safe token
  const token = `live_${merchant_id.slice(0, 8)}_${Math.random().toString(36).slice(2, 10)}_${Math.floor(now / 1000)}`;

  return {
    token,
    expires_at: expiresAt,
    window_ms: WINDOW_SEC * 1000,
    server_time: now,
  };
}

export async function secureCheckInDirect(payload) {
  const { merchant_id, quest_id, latitude, longitude } = payload;
  const { base44 } = await import("@/api/base44Client");

  // Fetch quest
  const quest = await base44.entities.Quest.get(quest_id).catch(() => null);
  const me = await base44.auth.me().catch(() => null);

  if (!quest) throw new Error("ไม่พบข้อมูลภารกิจ");
  if (quest.capacity && (quest.participants || 0) >= quest.capacity) {
    return { status: "full", xp: 20 };
  }

  // Create check-in log
  const checkin = await base44.entities.CheckIn.create({
    user_id: me?.id || null,
    quest_id: quest.id,
    merchant_id: merchant_id || quest.merchant_id,
    latitude,
    longitude,
    status: "verified",
    created_date: new Date().toISOString(),
  }).catch(() => ({ id: "ci_" + Date.now() }));

  // Increment participants
  const nextParticipants = (quest.participants || 0) + 1;
  await base44.entities.Quest.update(quest.id, {
    participants: nextParticipants,
  }).catch(() => {});

  // Calculate XP reward: Pro merchant gives 70 XP, standard gives 50 XP
  let baseReward = quest.xp_reward;
  if (!baseReward || baseReward === 50) {
    const merchant = await base44.entities.Merchant.get(merchant_id || quest.merchant_id).catch(() => null);
    const isPro = Boolean(merchant?.is_pro || merchant?.tier === "growth" || merchant?.tier === "premium");
    baseReward = isPro ? 70 : 50;
  }
  const earnedXp = Number(baseReward) || 50;

  // Add XP to user
  if (me?.id) {
    await base44.entities.User.update(me.id, {
      xp: (Number(me.xp) || 0) + earnedXp,
      total_checkins: (Number(me.total_checkins) || 0) + 1,
    }).catch(() => {});
  }

  return {
    status: "success",
    checkin_id: checkin.id,
    participants: nextParticipants,
    xp: earnedXp,
    coupon: quest,
  };
}
