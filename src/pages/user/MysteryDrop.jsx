import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { haversineMeters } from "@/lib/geo";
import { isQuestLiveNow } from "@/lib/questTime";
import { pickWeighted, startCooldown, REROLL_XP_COST } from "@/lib/mystery";
import MysterySetup from "@/components/mystery/MysterySetup";
import MysteryGacha from "@/components/mystery/MysteryGacha";
import MysteryReveal from "@/components/mystery/MysteryReveal";

const ROLL_ANIMATION_MS = 2200;

export default function MysteryDrop() {
  const [stage, setStage] = useState("setup"); // setup | rolling | hint | revealed | empty
  const [category, setCategory] = useState("all");
  const [radiusKm, setRadiusKm] = useState(2);
  const [pick, setPick] = useState(null); // { quest, merchant, distKm }
  const [rerolls, setRerolls] = useState(0);
  const [me, setMe] = useState(null);
  const lastPickIdRef = useRef(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => {});
  }, []);

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("no gps"));
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 6000 });
    });

  const roll = async () => {
    setStage("rolling");
    const t0 = Date.now();
    let pos = null;
    try { pos = await getLocation(); } catch { /* ไม่พิกัดก็สุ่มได้ */ }

    const [quests, merchants] = await Promise.all([
      base44.entities.Quest.filter({ status: "active" }, "-quest_date", 50),
      base44.entities.Merchant.list(),
    ]);
    const map = {};
    merchants.forEach((m) => { map[m.id] = m; });

    let distKm = null;
    const eligible = quests.filter((q) => {
      if (!isQuestLiveNow(q)) return false;
      if ((q.participants || 0) >= q.capacity) return false;
      const m = map[q.merchant_id];
      if (!m || m.status !== "approved") return false;
      if (category !== "all" && m.category !== category) return false;
      if (pos && m.lat != null && m.lng != null) {
        const d = haversineMeters(pos.coords.latitude, pos.coords.longitude, m.lat, m.lng) / 1000;
        if (d > radiusKm) return false;
        distKm = d; // will be overwritten per-pick below
      }
      return true;
    });

    // รอให้แอนิเมชันกาชาเล่นจนจบก่อนเปิดการ์ด
    await new Promise((r) => setTimeout(r, Math.max(0, ROLL_ANIMATION_MS - (Date.now() - t0))));

    const pool = eligible.length > 1 ? eligible.filter((q) => q.id !== lastPickIdRef.current) : eligible;
    const chosen = pickWeighted(pool, (q) => 1 + ((map[q.merchant_id]?.mystery_boost || 0) > 0 ? map[q.merchant_id].mystery_boost : 0));
    if (!chosen) { setStage("empty"); return; }

    const m = map[chosen.merchant_id];
    let pickDist = null;
    if (pos && m.lat != null && m.lng != null) {
      pickDist = Math.round((haversineMeters(pos.coords.latitude, pos.coords.longitude, m.lat, m.lng) / 1000) * 10) / 10;
    }
    lastPickIdRef.current = chosen.id;
    setPick({ quest: chosen, merchant: m, distKm: pickDist });
    setStage("hint");
  };

  const accept = () => {
    setStage("revealed");
    confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
  };

  const reroll = async () => {
    if (rerolls >= 1) {
      const xp = me?.xp || 0;
      if (xp < REROLL_XP_COST) {
        toast({ title: "XP ไม่พอสำหรับสุ่มใหม่", description: `ต้องใช้ ${REROLL_XP_COST} XP — ไปเช็คอินเก็บ XP เพิ่มก่อนนะ`, variant: "destructive" });
        return;
      }
      await base44.auth.updateMe({ xp: xp - REROLL_XP_COST });
      setMe({ ...me, xp: xp - REROLL_XP_COST });
    }
    setRerolls((r) => r + 1);
    roll();
  };

  const cancelRevealed = () => {
    startCooldown();
    toast({ title: "ยกเลิกภารกิจลับแล้ว", description: "ปุ่มสุ่มจะกลับมาใน 30 นาที อย่าทำแบบนี้กับกล่องสุ่มนะ 😉" });
    navigate("/user");
  };

  return (
    <div>
      {stage === "setup" && (
        <MysterySetup category={category} setCategory={setCategory} radiusKm={radiusKm} setRadiusKm={setRadiusKm} onRoll={roll} />
      )}
      {(stage === "rolling" || stage === "hint") && (
        <MysteryGacha
          stage={stage}
          merchant={pick?.merchant}
          quest={pick?.quest}
          distKm={pick?.distKm}
          rerolls={rerolls}
          canReroll={rerolls === 0 || (me?.xp || 0) >= REROLL_XP_COST}
          onAccept={accept}
          onReroll={reroll}
          onBack={() => setStage("setup")}
        />
      )}
      {stage === "revealed" && pick && (
        <MysteryReveal
          merchant={pick.merchant}
          quest={pick.quest}
          distKm={pick.distKm}
          onGo={() => navigate(`/user/checkin?quest=${pick.quest.id}&mystery=1`)}
          onCancel={cancelRevealed}
        />
      )}
      {stage === "empty" && (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <span className="text-5xl">🫥</span>
          <h2 className="mt-3 font-bold">ไม่มีร้านในเกณฑ์นี้เลย</h2>
          <p className="mt-1 text-sm text-muted-foreground">ลองขยายระยะทาง หรือเปลี่ยนหมวดหมู่ดูสิ</p>
          <button onClick={() => setStage("setup")} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">ปรับเงื่อนไข</button>
        </div>
      )}
    </div>
  );
}