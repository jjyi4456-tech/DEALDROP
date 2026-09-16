import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { INGREDIENTS } from "../../shared/ingredients.ts";

// Gacha drop: called right after a successful check-in. Verifies the check-in
// belongs to the calling user, rolls one random F&B ingredient, and upserts it
// into that user's inventory (user-scoped, RLS keeps it to the owner).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const checkinId = body?.checkin_id;
    if (!checkinId) return Response.json({ error: "checkin_id is required" }, { status: 400 });

    // Verify the check-in belongs to this user (anti-abuse: no free drops without a real check-in).
    const checkin = await base44.entities.CheckIn.get(checkinId).catch(() => null);
    if (!checkin) return Response.json({ error: "checkin not found" }, { status: 404 });
    if (checkin.user_id && checkin.user_id !== user.id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const drop = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];

    // Upsert into the user's own inventory (RLS: owner only).
    const existing = await base44.entities.UserInventory.filter({ item_key: drop.key });
    let quantity;
    if (existing.length > 0) {
      const row = existing[0];
      quantity = (row.quantity || 0) + 1;
      await base44.entities.UserInventory.update(row.id, { quantity });
    } else {
      quantity = 1;
      await base44.entities.UserInventory.create({
        user_id: user.id,
        item_key: drop.key,
        item_name: drop.name,
        emoji: drop.emoji,
        quantity: 1,
      });
    }

    return Response.json({ drop, quantity });
  } catch (error) {
    console.error("rollCheckInIngredient error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}