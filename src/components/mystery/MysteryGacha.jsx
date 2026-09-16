import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, RefreshCw, ChevronLeft } from "lucide-react";
import { CATEGORY_HINTS, CATEGORY_EMOJI, REROLL_XP_COST } from "@/lib/mystery";

const FACES = ["🍜", "🧋", "🍰", "☕", "🥐", "🎁", "🍲", "🍣"];

const rewardLabel = (q) =>
  q.reward_type === "percent" ? `ลด ${q.reward_value}%` :
  q.reward_type === "cash" ? `ลด ${q.reward_value}฿` : `แถม ${q.reward_value}`;

// Step 2: gacha roll animation → hidden hint card (shop name NOT revealed).
export default function MysteryGacha({ stage, merchant, quest, distKm, rerolls, canReroll, onAccept, onReroll, onBack }) {
  const [face, setFace] = useState("🎁");

  useEffect(() => {
    if (stage !== "rolling") return;
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % FACES.length; setFace(FACES[i]); }, 110);
    return () => clearInterval(id);
  }, [stage]);

  if (stage === "rolling") {
    return (
      <div className="py-10 text-center">
        <motion.div
          animate={{ scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }}
          transition={{ repeat: Infinity, duration: 0.45 }}
          className="mx-auto flex h-44 w-44 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-orange-400 text-8xl shadow-xl shadow-primary/30"
        >
          {face}
        </motion.div>
        <p className="mt-6 animate-pulse text-sm font-bold text-primary">กำลังสุ่มร้านลับ...</p>
      </div>
    );
  }

  // stage === "hint": the flipped mystery card
  const hint = merchant
    ? `${CATEGORY_HINTS[merchant.category] || "ร้านลับปริศนา"}${distKm != null ? ` · ห่างไป ${distKm} กม.` : " · อยู่ใกล้คุณแน่นอน"}`
    : "ร้านลับปริศนา";

  return (
    <motion.div
      key="hint"
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 text-center shadow-lg"
    >
      <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
        {merchant ? CATEGORY_EMOJI[merchant.category] || "🎁" : "🎁"}
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">ภารกิจลับ</p>
      <h2 className="mt-1 text-lg font-bold leading-snug">{hint}</h2>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">⚡ XP x2</span>
        {quest && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600"><Gift className="h-3.5 w-3.5" />{rewardLabel(quest)}</span>}
      </div>

      <button
        onClick={onAccept}
        className="mt-6 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition active:scale-95"
      >
        รับภารกิจลับ 🎉
      </button>
      <button
        onClick={onReroll}
        disabled={!canReroll}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
      >
        <RefreshCw className="h-4 w-4" />
        {rerolls === 0 ? "สุ่มใหม่ (ครั้งแรกฟรี)" : `สุ่มใหม่ (−${REROLL_XP_COST} XP)`}
      </button>
      <button
        onClick={onBack}
        className="mt-2 flex w-full items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> เปลี่ยนเงื่อนไขการสุ่ม
      </button>
    </motion.div>
  );
}