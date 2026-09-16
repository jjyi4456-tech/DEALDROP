import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Info, Target } from "lucide-react";

const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const inWindow = (g) => !!(g && g.start_date && g.end_date && todayStr() >= g.start_date && todayStr() <= g.end_date);

const RULES = "วิธีเล่น: ทุกครั้งที่นักศึกษาในแอปเช็คอินที่ร้าน หม้อไฟจะร้อนขึ้น +1 องศา เมื่อถึงเป้าหมายภายในเวลาที่กำหนด ระบบจะแจก Mega Reward ให้ทุกคนที่มีส่วนร่วมโดยอัตโนมัติ";

// Real-time Community Co-op Hotpot (หม้อไฟรวมพลัง) hero widget for the Home
// screen. Reads the running temperature (current_count) from the GlobalGoal
// "global variable" and subscribes to live updates so every user sees the pot
// boil over together as check-ins happen anywhere in the system.
export default function HotpotWidget() {
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);

  const load = async () => {
    try {
      const goals = await base44.entities.GlobalGoal.filter({ status: "active" }, "-created_date", 20);
      setGoal(goals.find(inWindow) || goals[0] || null);
    } catch {
      setGoal(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.GlobalGoal.subscribe((event) => {
      const d = event.data;
      if (!d) return;
      if (event.type === "create" && d.status === "active") { load(); return; }
      setGoal((prev) => (prev && d.id === prev.id ? { ...prev, ...d } : prev));
    });
    return unsub;
  }, []);

  if (loading || !goal) return null;

  const target = goal.target_count || 100;
  const current = goal.current_count || 0;
  const pct = Math.min(100, Math.round((current / target) * 100));
  const done = current >= target || goal.status === "completed";
  const heat = Math.min(1, current / target);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 overflow-hidden rounded-3xl border border-orange-200/80 bg-white p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍲</span>
          <div>
            <p className="text-sm font-bold leading-tight text-foreground">หม้อไฟรวมพลัง</p>
            <p className="text-xs text-muted-foreground">{goal.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRules((s) => !s)} className="rounded-full p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="กติกา">
            <Info className="h-4 w-4" />
          </button>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${done ? "bg-emerald-500" : "bg-orange-500"}`}>
            {done ? "สำเร็จ!" : "กำลังเดือด"}
          </span>
        </div>
      </div>

      {/* Rules — progressive disclosure behind the (i) icon */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="mt-3 rounded-xl bg-orange-50 p-3 text-xs leading-relaxed text-orange-800">{RULES}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero: clean 2D hotpot + temperature + CTA */}
      <div className="mt-4 flex items-center justify-center gap-5 py-2">
        <div className="relative h-28 w-32">
          {/* steam */}
          {!done && [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute bottom-24 h-2.5 w-2.5 rounded-full bg-white/70"
              style={{ left: 30 + i * 22 }}
              animate={{ y: [0, -26], opacity: [0.7, 0], scale: [1, 1.6] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5 }}
            />
          ))}
          {/* lid */}
          <div className="absolute left-1/2 top-3 h-2.5 w-24 -translate-x-1/2 rounded-full bg-foreground/85" />
          <div className="absolute left-1/2 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-foreground/85" />
          {/* pot body */}
          <div className="absolute bottom-0 h-20 w-32 overflow-hidden rounded-b-[2.5rem] rounded-t-lg border-2 border-foreground/80 bg-foreground/90">
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-b-[2.5rem]"
              style={{ background: `linear-gradient(to top, hsl(${50 - heat * 45}, 95%, ${52 - heat * 7}%), hsl(${10}, 95%, 58%))` }}
              animate={{ height: `${22 + pct * 0.62}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              <div className="absolute inset-x-0 top-0 h-1.5 rounded-full bg-white/40" />
            </motion.div>
            {!done && [0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-full bg-white/60"
                style={{ left: 28 + i * 36, bottom: 10 }}
                animate={{ y: [0, -24], opacity: [0.8, 0] }}
                transition={{ duration: 1.7, repeat: Infinity, delay: i * 0.5 }}
              />
            ))}
          </div>
          {/* handles */}
          <div className="absolute bottom-7 -left-[3px] h-4 w-3 rounded-l-full border-2 border-foreground/80" />
          <div className="absolute bottom-7 -right-[3px] h-4 w-3 rounded-r-full border-2 border-foreground/80" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-center">
            <p className="font-mono text-4xl font-bold leading-none text-orange-600">{Math.min(current, target)}°</p>
            <p className="text-xs text-muted-foreground">เป้า {target}°</p>
          </div>
          <Link to="/user/bag" className="flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100">
            <Target className="h-3 w-3" /> ดูเป้าหมาย
          </Link>
        </div>
      </div>

      {/* Capsule gradient progress bar (real-time) */}
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-orange-100">
        <motion.div
          className="h-3 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>🔥 ทุกเช็คอิน +1 องศา (Real-time)</span>
        <span>{current}/{target} ครั้ง</span>
      </div>

      {done && (
        <Link to="/user/bag" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-600">
          🎉 เป้าหมายสำเร็จ! ดู Mega Reward ของคุณ
        </Link>
      )}
    </motion.div>
  );
}