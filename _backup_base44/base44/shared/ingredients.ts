// Catalog of F&B ingredients that can drop from a successful check-in.
// This list MUST stay in sync with src/lib/ingredients.js (frontend mirror).
export const INGREDIENTS = [
  { key: "coffee_bean", name: "เมล็ดกาแฟ", emoji: "☕" },
  { key: "milk", name: "นมสด", emoji: "🥛" },
  { key: "sugar", name: "น้ำตาล", emoji: "🍬" },
  { key: "egg", name: "ไข่", emoji: "🥚" },
  { key: "flour", name: "แป้ง", emoji: "🌾" },
  { key: "chocolate", name: "ช็อกโกแลต", emoji: "🍫" },
  { key: "honey", name: "น้ำผึ้ง", emoji: "🍯" },
  { key: "matcha", name: "ผงมัทฉะ", emoji: "🍵" },
  { key: "strawberry", name: "สตรอว์เบอร์รี่", emoji: "🍓" },
  { key: "bread", name: "ขนมปัง", emoji: "🍞" },
];

// Gacha drop for a successful paid action (check-in bill / table order close):
// rolls one random ingredient and upserts it into the customer's inventory.
export async function grantGachaIngredient(svc, userId) {
  const rolled = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
  const rows = await svc.entities.UserInventory.filter(
    { item_key: rolled.key, user_id: userId }, "-created_date", 5
  );
  if (rows?.[0]) {
    await svc.entities.UserInventory.update(rows[0].id, { quantity: (rows[0].quantity || 0) + 1 });
  } else {
    await svc.entities.UserInventory.create({
      user_id: userId, item_key: rolled.key, item_name: rolled.name, emoji: rolled.emoji, quantity: 1,
    });
  }
  return rolled;
}