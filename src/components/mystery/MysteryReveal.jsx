import { motion } from "framer-motion";
import { MapPin, Zap, Gift, X } from "lucide-react";
import { CATEGORY_EMOJI } from "@/lib/mystery";

const rewardLabel = (q) =>
  q.reward_type === "percent" ? `ลด ${q.reward_value}%` :
  q.reward_type === "cash" ? `ลด ${q.reward_value}฿` : `แถม ${q.reward_value}`;

// Step 3: shop revealed after accepting — go check in, or cancel (30-min cooldown).
export default function MysteryReveal({ merchant, quest, distKm, onGo, onCancel }) {
  return (
    <motion.div
      key="reveal"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="overflow-hidden rounded-2xl border bg-card shadow-lg"
    >
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary to-orange-400 text-white">
        <span className="text-6xl">{CATEGORY_EMOJI[merchant?.category] || "🎁"}</span>
        <span className="absolute left-3 top-3 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">🔓 เปิดเผยแล้ว!</span>
      </div>
      <div className="p-5 text-center">
        <h2 className="text-xl font-bold">{merchant?.name || "ร้านลับ"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{quest?.title}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600"><MapPin className="h-3.5 w-3.5" />{distKm != null ? `${distKm} กม.` : "ใกล้คุณ"}</span>
          <span className="flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600"><Zap className="h-3.5 w-3.5" />+{(quest?.xp_reward || 50) * 2} XP</span>
          {quest && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600"><Gift className="h-3.5 w-3.5" />{rewardLabel(quest)}</span>}
        </div>

        <button
          onClick={onGo}
          className="mt-6 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition active:scale-95"
        >
          เดินทางไปเช็คอิน 📍
        </button>
        <button
          onClick={onCancel}
          className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" /> ยกเลิกภารกิจ (รอสุ่มใหม่ได้ใน 30 นาที)
        </button>
      </div>
    </motion.div>
  );
}