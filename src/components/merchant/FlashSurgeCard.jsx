import { useEffect, useState } from "react";
import { Zap, Timer, Square } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import useCountdown, { fmtMMSS } from "@/hooks/useCountdown";

const DISCOUNTS = [20, 25, 30];
const TABLES = [3, 5];

// ⚡ Flash Surge Drop — one-click 60-minute discount quest for empty tables.
// Shows the live status (countdown + claims + early-stop) while one is running.
export default function FlashSurgeCard() {
  const [merchant, setMerchant] = useState(null);
  const [active, setActive] = useState(null);
  const [discount, setDiscount] = useState(20);
  const [tables, setTables] = useState(3);
  const [releasing, setReleasing] = useState(false);
  const { toast } = useToast();
  const msLeft = useCountdown(active?.expires_at);

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!me) return;
      const mine = await base44.entities.Merchant.filter({ created_by_id: me.id }, "-created_date", 1);
      if (!alive) return;
      const m = mine[0] || null;
      setMerchant(m);
      if (m) {
        const rows = await base44.entities.Quest.filter(
          { merchant_id: m.id, is_flash: true, status: "active" }, "-created_date", 5
        ).catch(() => []);
        if (!alive) return;
        const live = rows.find((q) => q.expires_at && new Date(q.expires_at).getTime() > Date.now());
        setActive(live || null);
      }
    })();
    const unsub = base44.entities.Quest.subscribe((event) => {
      setActive((prev) => {
        if (!prev || event.data?.id !== prev.id) return prev;
        if (event.type === "delete") return null;
        if (event.type === "update") return { ...prev, ...event.data };
        return prev;
      });
    });
    return () => { alive = false; unsub(); };
  }, []);

  // When the 60 minutes run out, the quest auto-closes and the card resets.
  // Compare the raw expires_at against now — msLeft is stale (0) for one render
  // right after a new quest arrives, before the countdown hook has ticked.
  useEffect(() => {
    if (active?.expires_at && new Date(active.expires_at).getTime() <= Date.now()) setActive(null);
  }, [active, msLeft]);

  const release = async () => {
    if (!merchant || releasing) return;
    setReleasing(true);
    const isPro = Boolean(merchant?.is_pro || merchant?.tier === "growth" || merchant?.tier === "premium");
    const flashXp = isPro ? 70 : 50;

    try {
      const created = await base44.entities.Quest.create({
        merchant_id: merchant.id,
        merchant_name: merchant.name,
        title: `Flash Drop ${merchant.name} ลด ${discount}%`,
        description: "เรียกลูกค้าเข้าร้านทันทีใน 60 นาที สำหรับช่วงโต๊ะว่างหรือวันฝนตก",
        reward_type: "percent",
        reward_value: String(discount),
        capacity: tables,
        participants: 0,
        status: "active",
        is_flash: true,
        flash_badge: "⚡ Flash Drop ด่วน 60 นาที",
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        xp_reward: flashXp,
        squad_size: 0,
      });
      setActive(created);
      toast({ title: "ปล่อยเควสต์ด่วนแล้ว ⚡", description: `ลด ${discount}% · ${tables} โต๊ะ · ให้ ${flashXp} XP (หมดอายุใน 60 นาที)` });
    } catch {
      toast({ title: "ปล่อยเควสต์ไม่สำเร็จ ลองอีกครั้ง", variant: "destructive" });
    } finally {
      setReleasing(false);
    }
  };

  const stopFlash = async () => {
    if (!active) return;
    try {
      await base44.entities.Quest.update(active.id, { status: "expired" });
      setActive(null);
      toast({ title: "ยุติเควสต์ด่วนแล้ว", description: "การ์ดจะหายจากหน้าผู้ใช้ทันที" });
    } catch {
      toast({ title: "ยุติไม่สำเร็จ ลองอีกครั้ง", variant: "destructive" });
    }
  };

  if (!merchant) return null;

  // ---------- live status mode ----------
  if (active) {
    const claimed = active.participants || 0;
    return (
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold"><Zap className="h-4 w-4" /> FLASH DROP กำลังทำงาน</p>
            <p className="mt-2 text-4xl font-extrabold tabular-nums">เหลือเวลาอีก {fmtMMSS(msLeft)} นาที</p>
            <p className="mt-1 text-sm font-semibold opacity-90">🔥 ลูกค้าเคลมแล้ว {claimed}/{active.capacity} โต๊ะ · ลด {active.reward_value}%</p>
          </div>
          <button
            onClick={stopFlash}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-bold shadow-lg transition hover:bg-red-600 active:scale-95"
          >
            <Square className="h-4 w-4" /> ยุติเควสต์ก่อนกำหนด
          </button>
        </div>
      </div>
    );
  }

  // ---------- release mode ----------
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-6 text-white shadow-lg">
      <p className="text-lg font-extrabold">⚡ ปล่อยภารกิจสายฟ้าแลบ (Flash Surge Drop)</p>
      <p className="mt-1 text-sm opacity-90">เรียกลูกค้าเข้าร้านทันทีใน 60 นาที สำหรับช่วงโต๊ะว่างหรือวันฝนตก</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide opacity-80">เลือกส่วนลด</p>
          <div className="flex gap-2">
            {DISCOUNTS.map((d) => (
              <button key={d} onClick={() => setDiscount(d)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition active:scale-95 ${discount === d ? "bg-white text-orange-600 shadow" : "bg-white/20 hover:bg-white/30"}`}>
                ลด {d}%
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide opacity-80">จำนวนสิทธิ์</p>
          <div className="flex gap-2">
            {TABLES.map((t) => (
              <button key={t} onClick={() => setTables(t)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition active:scale-95 ${tables === t ? "bg-white text-orange-600 shadow" : "bg-white/20 hover:bg-white/30"}`}>
                {t} โต๊ะ
              </button>
            ))}
            <div className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white/10 px-3 text-xs font-semibold">
              <Timer className="h-3.5 w-3.5" /> 60 นาที
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={release}
        disabled={releasing}
        className="mt-4 w-full rounded-2xl bg-white py-3.5 text-base font-extrabold text-orange-600 shadow-lg transition hover:bg-orange-50 active:scale-95 disabled:opacity-70"
      >
        ⚡ ปล่อยเควสต์ด่วนทันที
      </button>
    </div>
  );
}