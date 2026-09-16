import { useEffect, useState } from "react";
import { Zap, Target, Coins, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";

const LV = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 10000];
const TITLES = ["นักชิมมือใหม่", "นักล่าฝึกหัด", "นักล่ามือฉมัง", "นักล่ามืออาชีพ", "นักล่าระดับเซียน", "เทพอาหาร"];

export default function StatusCard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const [checkins, coupons] = await Promise.all([
          base44.entities.CheckIn.filter({ user_id: me.id }, "-created_date", 500),
          base44.entities.Coupon.filter({ user_id: me.id }, "-created_date", 200),
        ]);
        const xp = me.xp || 0;
        let level = 1;
        for (let i = 0; i < LV.length; i++) if (xp >= LV[i]) level = i + 1;
        level = Math.min(level, LV.length);
        const next = LV[level] ?? LV[LV.length - 1];
        const savings = coupons.reduce((s, c) => (c.reward_type === "cash" ? s + (parseFloat(c.reward_value) || 0) : s), 0);
        setData({ xp, level, next, missions: checkins.length, savings });
      } catch {
        setData({ xp: 0, level: 1, next: 100, missions: 0, savings: 0 });
      }
    })();
  }, []);

  if (!data) {
    return <div className="mb-4 h-40 animate-pulse rounded-3xl bg-muted" />;
  }

  const title = TITLES[Math.min(data.level - 1, TITLES.length - 1)];
  const pct = Math.min(100, (data.xp / data.next) * 100);

  return (
    <div className="mb-4 overflow-hidden rounded-3xl p-5 text-white shadow-lg" style={{ background: "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)" }}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <span className="text-2xl font-extrabold">Lv.{data.level}</span>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-white/70">ตำแหน่ง</p>
          <p className="text-lg font-bold leading-tight">{title}</p>
        </div>
        <Trophy className="h-8 w-8" style={{ color: "#FBBF24" }} />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-white/80">XP Progress</span>
          <span className="font-semibold">{data.xp} / {data.next}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-200 to-amber-200 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat icon={<Zap className="h-5 w-5" style={{ color: "#F59E0B" }} />} value={data.xp} label="XP" />
        <Stat icon={<Target className="h-5 w-5" style={{ color: "#34D399" }} />} value={data.missions} label="ภารกิจสำเร็จ" />
        <Stat icon={<Coins className="h-5 w-5" style={{ color: "#22D3EE" }} />} value={`฿${data.savings.toLocaleString()}`} label="ประหยัดได้" sub={data.savings === 0 ? "ประหยัดเร็วๆ นี้" : undefined} />
      </div>
    </div>
  );
}

function Stat({ icon, value, label, sub }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <div className="mb-1 flex justify-center">{icon}</div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-xs text-white/70">{label}</p>
      {sub && <p className="text-xs text-white/50">{sub}</p>}
    </div>
  );
}