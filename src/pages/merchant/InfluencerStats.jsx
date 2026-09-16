import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { base44 } from "@/api/base44Client";
import { Users, Camera, Ticket, Eye } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const VIEWS_PER_SHARE = 300;

// bonus the shop granted for a story share, parsed from the ledger description
const storyBonus = (l) => {
  const m = (l.description || "").match(/📸 โบนัสสตอรี่ -฿([\d.,]+)/);
  return m ? parseFloat(m[1].replace(/,/g, "")) : 0;
};

const fmtTHB = (n) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

// 📸 Micro-Influencer summary page: every IG/TikTok story share this shop got
// from customers, who shared (pseudonymised), and the coupon rewards it cost.
export default function InfluencerStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return;
      const mine = await base44.entities.Merchant.filter({ created_by_id: user.id }, "-created_date", 1).catch(() => []);
      const m = mine?.[0];
      if (!m) return;
      const ledger = await base44.entities.MerchantLedger.filter({ merchant_id: m.id }, "-created_date", 100).catch(() => []);
      const shares = (ledger || []).filter((l) => l.story_shared);

      // Group by the customer who shared — resolved via the redeemed coupon's owner
      const couponIds = [...new Set(shares.map((l) => l.coupon_id).filter(Boolean))];
      const couponUser = {};
      for (const id of couponIds) {
        const c = await base44.entities.Coupon.get(id).catch(() => null);
        if (c?.user_id) couponUser[id] = c.user_id;
      }
      const byInfluencer = {};
      for (const l of shares) {
        const uid = couponUser[l.coupon_id] || "anon";
        if (!byInfluencer[uid]) byInfluencer[uid] = { shares: 0, reward: 0 };
        byInfluencer[uid].shares += 1;
        byInfluencer[uid].reward += storyBonus(l);
      }

      // Shares per day over the last 14 days
      const byDay = {};
      shares.forEach((l) => {
        const k = new Date(l.created_date).toDateString();
        byDay[k] = (byDay[k] || 0) + 1;
      });
      const chartData = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 13 + i);
        return { d: `${d.getDate()}/${d.getMonth() + 1}`, v: byDay[d.toDateString()] || 0 };
      });

      const totalReward = shares.reduce((s, l) => s + storyBonus(l), 0);
      setStats({
        shares: shares.length,
        influencers: Object.keys(byInfluencer).length,
        totalReward,
        reach: shares.length * VIEWS_PER_SHARE,
        top: Object.entries(byInfluencer)
          .sort((a, b) => b[1].shares - a[1].shares || b[1].reward - a[1].reward)
          .map(([uid, v], i) => ({
            name: `Foodie •${uid.slice(-4)}`,
            shares: v.shares,
            reward: v.reward,
            rank: i + 1,
          })),
        chartData,
      });
    })();
  }, []);

  if (!stats) {
    return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }

  return (
    <div>
      <PageHeader
        title="📸 สรุปสถิติ Micro-Influencer"
        subtitle="ยอดแชร์ผ่าน IG & TikTok Story ของลูกค้า และผลตอบแทนคูปองที่ร้านแจกกลับ"
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Micro-Influencer ของร้าน" value={`${stats.influencers} คน`} icon={Users} />
        <StatCard label="ยอดแชร์สตอรี่รวม" value={`${stats.shares} ครั้ง`} icon={Camera} />
        <StatCard label="ผลตอบแทนคูปองรวม" value={fmtTHB(stats.totalReward)} sub="ส่วนลดโบนัสที่แจกกลับ" icon={Ticket} />
        <StatCard label="ยอดเข้าถึงประมาณการ" value={`~${stats.reach.toLocaleString("th-TH")} วิว`} sub="~300 วิว/ครั้ง" icon={Eye} />
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-4 font-semibold">ยอดแชร์สตอรี่รายวัน (14 วันล่าสุด)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="d" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#a855f7" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-3 font-semibold">Micro-Influencer ของร้าน</h3>
        {stats.top.length === 0 ? (
          <div className="rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีลูกค้าแชร์สตอรี่ — เปิด "IG & TikTok Story Multiplier" ที่หน้าโปรไฟล์ร้านเพื่อให้ลูกค้าช่วยโปรโมท
          </div>
        ) : (
          <div className="space-y-2">
            {stats.top.map((u) => (
              <div key={u.name} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">{u.rank}</span>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">แชร์ {u.shares} ครั้ง · ช่วยโปรโมท ~{(u.shares * VIEWS_PER_SHARE).toLocaleString("th-TH")} วิว</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-purple-600">รับโบนัส {fmtTHB(u.reward)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}