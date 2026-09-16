import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Craft a coupon from a recipe. Server-side validation prevents the client
// from crafting with insufficient ingredients. All writes are user-scoped
// (RLS keeps inventory rows to the owner; coupons are open-create).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const recipeId = body?.recipe_id;
    if (!recipeId) return Response.json({ error: "recipe_id is required" }, { status: 400 });

    const recipe = await base44.entities.Recipe.get(recipeId).catch(() => null);
    if (!recipe) return Response.json({ error: "recipe not found" }, { status: 404 });

    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    if (ingredients.length === 0) {
      return Response.json({ error: "invalid recipe" }, { status: 400 });
    }

    // Load the caller's own inventory (RLS: owner only).
    const inventory = await base44.entities.UserInventory.list();

    // Validate every ingredient is present in sufficient quantity.
    const toDeduct = [];
    for (const ing of ingredients) {
      const need = Number(ing.quantity) || 1;
      const row = inventory.find((i) => i.item_key === ing.key);
      const have = row ? (row.quantity || 0) : 0;
      if (have < need) {
        return Response.json({ error: "not_enough_ingredients", missing: ing.key, have, need }, { status: 400 });
      }
      toDeduct.push({ row, need });
    }

    // Deduct ingredients.
    for (const d of toDeduct) {
      const newQty = (d.row.quantity || 0) - d.need;
      if (newQty <= 0) {
        await base44.entities.UserInventory.delete(d.row.id);
      } else {
        await base44.entities.UserInventory.update(d.row.id, { quantity: newQty });
      }
    }

    // Mint the reward coupon (30-day validity).
    const code = "CPN-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    const expiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const coupon = await base44.entities.Coupon.create({
      user_id: user.id,
      title: recipe.result_title,
      reward_type: recipe.result_reward_type,
      reward_value: String(recipe.result_reward_value),
      status: "available",
      qr_code: code,
      expiry_date: expiry,
    });

    return Response.json({ ok: true, recipe_id: recipeId, coupon_id: coupon.id, title: recipe.result_title });
  } catch (error) {
    console.error("craftRecipe error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}