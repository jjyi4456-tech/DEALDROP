import { NavLink } from "react-router-dom";
import { LayoutDashboard, Store, Package, Sparkles, Megaphone, Trophy, Target, QrCode, Compass, Wallet, Coffee, Flame, Backpack, Percent, Landmark, Home, Share2, Utensils, BellRing } from "lucide-react";

export const NAV = {
  admin: {
    label: "ผู้ดูแลระบบ",
    color: "from-violet-500 to-indigo-500",
    items: [
      { to: "/admin", label: "ภาพรวมแพลตฟอร์ม", icon: LayoutDashboard, end: true },
      { to: "/admin/merchants", label: "จัดการร้านค้า (KYC)", icon: Store },
      { to: "/admin/plans", label: "จัดการแพ็กเกจ", icon: Package },
      { to: "/admin/gamification", label: "เครื่องยนต์เกม", icon: Sparkles },
      { to: "/admin/community", label: "หม้อไฟรวมพลัง", icon: Flame },
      { to: "/admin/ads", label: "จัดการโฆษณา", icon: Megaphone },
      { to: "/admin/revenue", label: "รายได้ & ส่วนแบ่ง", icon: Wallet },
      { to: "/admin/commission", label: "คอมมิชชั่นร้านค้า", icon: Percent },
      { to: "/admin/settlement", label: "ตัดรอบจ่ายเงิน", icon: Landmark },
    ],
  },
  merchant: {
    label: "ฝั่งร้านค้า",
    color: "from-emerald-500 to-teal-500",
    items: [
      { to: "/merchant", label: "หน้าหลักร้าน", icon: LayoutDashboard, end: true },
      { to: "/merchant/orders", label: "🛎️ ออเดอร์ในครัว", icon: BellRing },
      { to: "/merchant/menu", label: "📋 จัดการเมนูอาหาร", icon: Utensils },
      { to: "/merchant/quests", label: "จัดการภารกิจ", icon: Target },
      { to: "/merchant/scanner", label: "สแกนเนอร์หน้าร้าน", icon: QrCode },
      { to: "/merchant/influencers", label: "สถิติ Micro-Influencer", icon: Share2 },
      { to: "/merchant/finance", label: "ศูนย์การเงินและแพ็กเกจ", icon: Wallet },
      { to: "/merchant/profile", label: "หน้าร้านดิจิทัล", icon: Store },
    ],
  },
  user: {
    label: "ฝั่งผู้ใช้",
    color: "from-orange-500 to-pink-500",
    items: [
      { to: "/user", label: "หน้าแรก", icon: Home, end: true },
      { to: "/user/checkin", label: "ภารกิจ", icon: Compass },
      { to: "/user/leaderboard", label: "จัดอันดับ", icon: Trophy },
      { to: "/user/bag", label: "กระเป๋าเป้", icon: Backpack },
      { to: "/user/pet", label: "สัตว์เลี้ยง", icon: Sparkles },
    ],
  },
};

export const PERSONAS = [
  { key: "admin", label: "ผู้ดูแลระบบ", icon: Trophy, path: "/admin" },
  { key: "merchant", label: "ร้านค้า", icon: Store, path: "/merchant" },
  { key: "user", label: "ผู้ใช้งาน", icon: Coffee, path: "/user" },
];