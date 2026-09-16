import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { verifyToken, sha256Hex } from "../../shared/liveQr.ts";
import { haversineMeters } from "../../shared/geo.ts";

// Dual-factor storefront check-in: Dynamic QR token + geofence distance.
// Server-authoritative — the client can no longer self-verify a check-in.

const MAX_ACCURACY_M = 150; // backend guard (client enforces 100m)
const RATE_LIMIT_MAX_ATTEMPTS = 10; // failed attempts...
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // ...within 5 minutes

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const qrToken = body?.qr_token;
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    const accuracy = body?.accuracy != null ? Number(body.accuracy) : null;
    const questId = body?.quest_id || null;

    if (!qrToken || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json(
        { error: "INVALID_PAYLOAD", message: "qr_token, latitude, longitude are required" },
        { status: 400 }
      );
    }

    // Security audit trail — every decision is logged (immutable for users).
    const audit = (eventType, reasonCode, details) =>
      base44.entities.SecurityAuditLog.create({
        user_id: user.id,
        user_name: user.full_name || "",
        merchant_id: details?.merchant_id || null,
        event_type: eventType,
        reason_code: reasonCode,
        details: {
          latitude,
          longitude,
          accuracy,
          client_timestamp: body?.client_timestamp || null,
          ...(details || {}),
        },
      }).catch(() => null);

    // Step 0: brute-force guard — count failed attempts in the last 5 minutes
    const recent = await svc.entities.SecurityAuditLog.filter({ user_id: user.id }, "-created_date", 30);
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    const recentFails = (recent || []).filter(
      (r) => new Date(r.created_date).getTime() > cutoff && r.event_type !== "checkin_approved"
    );
    if (recentFails.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      await audit("rate_limited", "RATE_LIMITED", {});
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many failed attempts. Try again in a few minutes." },
        { status: 429 }
      );
    }

    // Step 1: verify HMAC-SHA256 signature + time window (server clock only)
    const secret = secrets.get("LIVE_QR_HMAC_SECRET");
    const v = await verifyToken(qrToken, secret);
    if (!v.ok) {
      const code =
        v.reason === "expired" ? "TOKEN_EXPIRED" : v.reason === "malformed" ? "TOKEN_MALFORMED" : "TOKEN_INVALID";
      await audit("token_rejected", code, { merchant_id: null });
      return Response.json({ error: code }, { status: 403 });
    }

    // Merchant must exist, be open for business, and have registered coordinates
    const merchant = await svc.entities.Merchant.get(v.merchant_id).catch(() => null);
    if (!merchant || merchant.status === "suspended" || merchant.status === "rejected") {
      await audit("merchant_rejected", "MERCHANT_NOT_AVAILABLE", { merchant_id: v.merchant_id });
      return Response.json({ error: "MERCHANT_NOT_AVAILABLE" }, { status: 403 });
    }
    if (merchant.lat == null || merchant.lng == null) {
      await audit("merchant_rejected", "MERCHANT_LOCATION_NOT_SET", { merchant_id: merchant.id });
      return Response.json({ error: "MERCHANT_LOCATION_NOT_SET" }, { status: 409 });
    }

    // Step 2: replay-attack guard — each token can be redeemed exactly once
    const tokenHash = await sha256Hex(qrToken);
    const used = await svc.entities.QrTokenUsage.filter({ token_hash: tokenHash }, "-created_date", 5);
    if ((used || []).length > 0) {
      await audit("token_reused", "TOKEN_REUSED", { merchant_id: merchant.id, token_hash: tokenHash });
      return Response.json({ error: "TOKEN_REUSED" }, { status: 403 });
    }

    // Step 3a: GPS sanity — reject untrustworthy fixes (anti-spoofing)
    if (accuracy != null && Number.isFinite(accuracy) && accuracy > MAX_ACCURACY_M) {
      await audit("gps_rejected", "LOW_GPS_ACCURACY", { merchant_id: merchant.id, accuracy });
      return Response.json({ error: "LOW_GPS_ACCURACY", accuracy }, { status: 422 });
    }

    // Step 3b: geofence distance (Haversine) vs the merchant's registered pin
    const radius = merchant.geofence_radius || 50;
    const distance = Math.round(haversineMeters(latitude, longitude, merchant.lat, merchant.lng));
    if (distance > radius) {
      await audit("geofence_rejected", "OUT_OF_GEOFENCE", { merchant_id: merchant.id, distance, radius });
      return Response.json({ error: "OUT_OF_GEOFENCE", distance, radius }, { status: 403 });
    }

    // —— Step 4: approved — burn the token, then award ——
    await base44.entities.QrTokenUsage.create({
      token_hash: tokenHash,
      merchant_id: merchant.id,
      user_id: user.id,
    });

    let xpReward = 50;
    let coupon = null;
    let participants = null;
    let consolation = false;

    if (questId) {
      const quest = await svc.entities.Quest.get(questId).catch(() => null);
      if (!quest || quest.status !== "active") {
        await audit("quest_rejected", "QUEST_NOT_ACTIVE", { merchant_id: merchant.id, quest_id: questId });
        return Response.json({ error: "QUEST_NOT_ACTIVE" }, { status: 409 });
      }
      const left = (quest.capacity || 0) - (quest.participants || 0);
      if (left <= 0) {
        // They made it to the shop but the quest is full — consolation reward
        xpReward = 20;
        consolation = true;
        coupon = { title: "รางวัลปลอบใจ ลด 5%", reward_type: "percent", reward_value: "5" };
      } else {
        await svc.entities.Quest.update(questId, { participants: (quest.participants || 0) + 1 });
        participants = (quest.participants || 0) + 1;
        xpReward = (quest.xp_reward || 50) * (body?.mystery ? 2 : 1);
        const rewardText =
          quest.reward_type === "percent" ? `ลด ${quest.reward_value}%`
          : quest.reward_type === "cash" ? `ลด ${quest.reward_value}฿`
          : `แถม ${quest.reward_value}`;
        coupon = {
          title: `${quest.title} ${rewardText}`,
          reward_type: quest.reward_type,
          reward_value: String(quest.reward_value),
        };
      }
    }

    const checkin = await base44.entities.CheckIn.create({
      user_id: user.id,
      merchant_id: merchant.id,
      merchant_name: merchant.name,
      merchant_owner_id: merchant.created_by_id,
      quest_id: questId,
      xp_earned: xpReward,
      lat: latitude,
      lng: longitude,
    }).catch(() => null);

    if (coupon) {
      await base44.entities.Coupon.create({
        user_id: user.id,
        merchant_id: merchant.id,
        merchant_name: merchant.name,
        quest_id: questId,
        title: coupon.title,
        reward_type: coupon.reward_type,
        reward_value: coupon.reward_value,
        status: "available",
        qr_code: "CPN-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
        expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      }).catch(() => null);
    }

    await svc.entities.User.update(user.id, {
      xp: (user.xp || 0) + xpReward,
      total_checkins: (user.total_checkins || 0) + 1,
    });

    // Gacha drop for real check-ins (bonus — never blocks the check-in)
    let drop = null;
    if (!consolation && checkin?.id) {
      try {
        const r = await base44.functions.invoke("rollCheckInIngredient", { checkin_id: checkin.id });
        drop = r?.drop || r?.data?.drop || null;
      } catch { /* non-fatal */ }
    }

    await audit("checkin_approved", "OK", { merchant_id: merchant.id, distance, xp: xpReward });

    return Response.json({
      ok: true,
      status: consolation ? "full" : "approved",
      checkin_id: checkin?.id || null,
      xp: xpReward,
      coupon: coupon ? { ...coupon } : null,
      drop,
      distance,
      participants,
    });
  } catch (error) {
    console.error("secureCheckIn error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}