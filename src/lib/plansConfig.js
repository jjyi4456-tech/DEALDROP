/**
 * Standard DEALDROP Plans Configuration
 * Exactly 2 Tiers: Starter (Free) and Pro (฿259/month)
 */

export const DEFAULT_PLANS = [
  {
    id: "plan_starter",
    code: "starter",
    name: "Starter (เริ่มต้นฟรี)",
    price: 0,
    color: "#10b981", // emerald
    description: "เหมาะสำหรับร้านค้าทั่วไป เริ่มต้นดึงดูดลูกค้าเข้าร้าน ไม่มีค่าใช้จ่ายรายเดือน",
    quest_quota: 2,
    quest_unlimited: false,
    geofence_radius: 1500, // 1.5 km
    push_quota: 0,
    banner_days: 0,
    commission_rate: 0.06, // 6% GP
    xp_reward: 50,
    features: [
      "ค่าคอมมิชชั่น 6% ต่อบิลสำเร็จ",
      "ผู้เล่นได้รับ 50 XP เมื่อเช็คอิน",
      "สร้างภารกิจได้สูงสุด 2 เควสต์พร้อมกัน",
      "รัศมีเรดาร์มองเห็น 1.5 กม. รอบร้าน",
      "Flash Drop ด่วน 3 ครั้ง/สัปดาห์",
      "ปล่อยดีลกู้ชีพอาหาร (Rescue Deals) 3 เมนู/วัน",
      "ระบบ QR เมนูสั่งอาหารที่โต๊ะ & ปิดบิลแคชเชียร์",
    ],
    active: true,
  },
  {
    id: "plan_pro",
    code: "pro",
    name: "Pro Booster (โปรบูสเตอร์)",
    price: 259,
    color: "#f59e0b", // amber/gold
    description: "แพ็กเกจสุดคุ้มสำหรับร้านค้าที่ต้องการลูกค้าแน่นร้าน ลดค่าคอมมิชชันเหลือเพียง 3%",
    quest_quota: 9999,
    quest_unlimited: true,
    geofence_radius: 5000, // 5 km
    push_quota: 5,
    banner_days: 3,
    commission_rate: 0.03, // 3% GP
    xp_reward: 70,
    features: [
      "ลดค่าคอมมิชชั่นเหลือเพียง 3% (ประหยัด 50% ทันที)",
      "⭐ โบนัสผู้เล่นได้รับ 70 XP (+40% ดึงดูดนักล่าเควสต์)",
      "สร้างภารกิจได้ไม่จำกัด (Unlimited Quests)",
      "ขยายรัศมีเรดาร์ 5 กม. มองเห็นได้ไกลทั่วเมือง",
      "⚡ ปล่อย Flash Drop ด่วน 60 นาทีได้ไม่จำกัดครั้ง",
      "🚨 ปล่อยดีลกู้ชีพอาหารสต็อกเหลือได้ไม่จำกัด",
      "หมุดร้านเด่นสีทองบนแผนที่ (Featured Gold Pin)",
      "ส่ง LBS Push แจ้งเตือนลูกค้าใกล้เคียง 5 ครั้ง/เดือน",
      "เข็มกลัดร้านค้า Pro Booster Verified",
    ],
    active: true,
  },
];

export const TIER_LABELS = {
  starter: "Starter",
  pro: "Pro Booster",
  // backward compatibility aliases
  growth: "Pro Booster",
  premium: "Pro Booster",
};

export const TIER_COLORS = {
  starter: "#10b981",
  pro: "#f59e0b",
  growth: "#f59e0b",
  premium: "#f59e0b",
};
