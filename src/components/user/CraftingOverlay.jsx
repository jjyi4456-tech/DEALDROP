import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { base44 } from "@/api/base44Client";
import { ingredientByKey } from "@/lib/ingredients";
import { X, Gift } from "lucide-react";

// Fun brewing overlay shown while a craft is processing. Owns the backend
// invoke, plays a minimum mixing animation, then reveals the result with an
// orange confetti burst on success.
const MIX_DURATION = 2400;

export default function CraftingOverlay({ recipe, onClose, onSuccess }) {
  const [phase, setPhase] = useState("mixing"); // mixing | success | error
  const [errMsg, setErrMsg] = useState("");
  const resultRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    base44.functions.invoke("craftRecipe", { recipe_id: recipe.id })
      .then((res) => {
        const data = res?.data ?? res;
        if (data?.ok) {
          resultRef.current = data;
          const wait = Math.max(0, MIX_DURATION - (Date.now() - start));
          setTimeout(() => { if (!cancelled) setPhase("success"); }, wait);
        } else {
          if (!cancelled) { setErrMsg(data?.error || "ไม่สามารถผสมได้"); setPhase("error"); }
        }
      })
      .catch((e) => {
        if (!cancelled) { setErrMsg(e?.message || "ไม่สามารถผสมได้"); setPhase("error"); }
      });
    return () => { cancelled = true; };
  }, [recipe.id]);

  // Fire the orange confetti the moment the success phase appears.
  useEffect(() => {
    if (phase !== "success") return;
    const colors = ["#FF7A00", "#FFB347", "#FFD580", "#ffffff"];
    confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.5 }, colors });
    const t1 = setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors }), 150);
    const t2 = setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors }), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  const ingredients = (recipe.ingredients || []).map((ing) => ({
    ...ing,
    emoji: ing.emoji || ingredientByKey[ing.key]?.emoji || "🧪",
  }));

  const rewardLabel =
    recipe.result_reward_type === "percent" ? `ลด ${recipe.result_reward_value}%`
    : recipe.result_reward_type === "cash" ? `ลด ${recipe.result_reward_value}฿`
    : `แถม ${recipe.result_reward_value}`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-orange-50 to-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full p-2.5 text-muted-foreground hover:bg-black/5">
          <X className="h-5 w-5" />
        </button>

        <AnimatePresence mode="wait">
          {phase === "mixing" && (
            <motion.div key="mixing" exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center pt-2">
              <h3 className="text-lg font-bold text-primary">กำลังผสมวัตถุดิบ</h3>
              <p className="mb-3 text-xs text-muted-foreground">{recipe.name}</p>

              <div className="relative flex h-52 w-52 items-center justify-center">
                {/* glow */}
                <motion.div className="absolute h-32 w-32 rounded-full bg-primary/20 blur-2xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* orbiting ingredients */}
                <motion.div className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
                >
                  {ingredients.map((ing, i) => {
                    const angle = (i / Math.max(ingredients.length, 1)) * 2 * Math.PI;
                    const R = 82;
                    const x = Math.cos(angle) * R;
                    const y = Math.sin(angle) * R;
                    return (
                      <motion.div key={ing.key}
                        className="absolute left-1/2 top-1/2 flex h-11 w-11 -ml-[22px] -mt-[22px] items-center justify-center rounded-full bg-white text-2xl shadow-md"
                        style={{ x, y }}
                        animate={{ rotate: -360, scale: [1, 1.18, 1] }}
                        transition={{ rotate: { duration: 9, repeat: Infinity, ease: "linear" }, scale: { duration: 1.3, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" } }}
                      >
                        {ing.emoji}
                      </motion.div>
                    );
                  })}
                </motion.div>
                {/* bubbling pot */}
                <motion.div
                  className="z-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-5xl shadow-lg"
                  animate={{ scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ⚗️
                </motion.div>
                {/* rising bubbles */}
                {[0, 1, 2].map((b) => (
                  <motion.span key={b} className="absolute z-20 text-xs text-primary/50"
                    initial={{ y: 24, x: (b - 1) * 18, opacity: 0 }}
                    animate={{ y: [-10, -56], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: b * 0.5, ease: "easeOut" }}
                  >●</motion.span>
                ))}
              </div>

              {/* shimmer progress */}
              <div className="mt-1 h-2 w-48 overflow-hidden rounded-full bg-orange-100">
                <motion.div className="h-2 rounded-full bg-primary"
                  initial={{ x: "-100%" }} animate={{ x: "100%" }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">รอให้วัตถุดิบละลายเข้าด้วยกัน...</p>
            </motion.div>
          )}

          {phase === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center pt-2 text-center">
              <motion.div
                animate={{ scale: [0.8, 1.25, 1], rotate: [0, 12, -12, 0] }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-200 text-5xl shadow-lg"
              >
                🎟️
              </motion.div>
              <motion.h3 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                className="text-2xl font-bold text-primary">ผสมสำเร็จ! 🎉</motion.h3>
              <p className="mt-1 text-sm text-muted-foreground">{recipe.name}</p>

              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
                className="mt-4 w-full rounded-2xl border border-primary/30 bg-white p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Gift className="h-4 w-4 text-primary" /> คูปองที่ได้รับ</div>
                <p className="mt-1 text-lg font-bold leading-tight">{recipe.result_title}</p>
                <p className="mt-1 text-sm font-bold text-primary">{rewardLabel}</p>
              </motion.div>

              <button onClick={onSuccess} className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:scale-95">
                รับคูปอง / ดูคลัง
              </button>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-4 text-center">
              <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-4xl">😅</div>
              <h3 className="text-lg font-bold text-red-500">ผสมไม่สำเร็จ</h3>
              <p className="mt-1 text-sm text-muted-foreground">{errMsg || "วัตถุดิบอาจไม่พอ ลองสะสมเพิ่มอีก"}</p>
              <button onClick={onClose} className="mt-5 w-full rounded-2xl border py-3 text-sm font-bold hover:bg-accent">ปิด</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}