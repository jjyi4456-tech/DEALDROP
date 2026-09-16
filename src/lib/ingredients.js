// F&B ingredient catalog for the Recipe Crafter & Gacha feature.
// Mirror of base44/shared/ingredients.ts (backend can't import src/).
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

export const ingredientByKey = Object.fromEntries(INGREDIENTS.map((i) => [i.key, i]));