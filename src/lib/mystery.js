// Mystery Food Drop helpers: cooldown + weighted randomizer + hint copy
const COOLDOWN_KEY = "mystery_cooldown_until";

export const COOLDOWN_MS = 30 * 60 * 1000; // 30 นาที
export const REROLL_XP_COST = 50;

export const getCooldownRemaining = () =>
  Math.max(0, (Number(localStorage.getItem(COOLDOWN_KEY)) || 0) - Date.now());

export const startCooldown = () =>
  localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));

export const clearCooldown = () => localStorage.removeItem(COOLDOWN_KEY);

// Weighted pick: items with higher weight are more likely to be chosen.
export const pickWeighted = (items, weightOf) => {
  if (!items.length) return null;
  const weights = items.map((it, i) => Math.max(0.0001, weightOf(it, i) || 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
};

export const CATEGORY_HINTS = {
  cafe: "ร้านคาเฟ่สไตล์มินิมอล",
  restaurant: "ร้านอาหารรสแซ่บ",
  beverage: "ร้านเครื่องดื่มเจ้าดัง",
  dessert: "ร้านขนมหวานกำลังเด็ด",
  bakery: "เบเกอรี่หอมสดใหม่",
};

export const CATEGORY_EMOJI = {
  cafe: "☕",
  restaurant: "🍜",
  beverage: "🧋",
  dessert: "🍰",
  bakery: "🥐",
};

export const MYSTERY_CATEGORIES = [
  { key: "all", label: "🎲 สุ่มทุกหมวด" },
  { key: "cafe", label: "☕ คาเฟ่" },
  { key: "restaurant", label: "🍜 อาหาร" },
  { key: "beverage", label: "🧋 เครื่องดื่ม" },
  { key: "dessert", label: "🍰 ขนมหวาน" },
  { key: "bakery", label: "🥐 เบเกอรี่" },
];

export const fmtCountdown = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};