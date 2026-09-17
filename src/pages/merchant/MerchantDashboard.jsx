import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { base44 } from "@/api/base44Client";
import { Target, Users, Wallet, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import FlashSurgeCard from "@/components/merchant/FlashSurgeCard";
import StoryBoostStatCard from "@/components/merchant/StoryBoostStatCard";
import RepeatRetentionCard from "@/components/merchant/RepeatRetentionCard";
import QuickActions from "@/components/merchant/QuickActions";
import MerchantRescueDealsSection from "@/components/merchant/MerchantRescueDealsSection";

export default function MerchantDashboard() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myMerchant, setMyMerchant] = useState(null);
  const [rescueRefreshKey, setRescueRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [qs, me] = await Promise.all([
          base44.entities.Quest.list("-quest_date", 50),
          base44.auth.me().catch(() => null),
        ]);
        setQuests(qs);
        if (me) {
          const mine = await base44.entities.Merchant.filter({ created_by_id: me.id }, "-created_date", 1);
          setMyMerchant(mine[0] || null);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const active = quests.filter((q) => q.status === "active").length;
  const totalCheckins = quests.reduce((s, q) => s + (q.participants || 0), 0);

  return (
    <div>
      <PageHeader title="หน้าหลักร้าน" subtitle="ภาพรวมการดำเนินงานและสถานะแพ็กเกจของคุณ"
        action={<Link to="/merchant/finance" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">จัดการแพ็กเกจ</Link>} />

      <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-85 font-semibold">สถานะแพ็กเกจปัจจุบัน</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">
              {myMerchant?.is_pro || myMerchant?.tier === "pro" || myMerchant?.tier === "growth" || myMerchant?.tier === "premium"
                ? "Pro Booster ⭐ ฿259/เดือน"
                : "Starter · ฟรีตลอดชีพ"}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {myMerchant?.is_pro || myMerchant?.tier === "pro" || myMerchant?.tier === "growth" || myMerchant?.tier === "premium"
                ? "ค่าคอมมิชชั่นลดเหลือ 3% · ผู้เล่นได้รับโบนัส 70 XP ทุกเควสต์"
                : "ค่าคอมมิชชั่น 6% · อัปเกรดเป็น Pro Booster เพียง ฿259/เดือน เพื่อรับสิทธิ์พิเศษ"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/merchant/finance" className="rounded-xl bg-white/20 px-4 py-2.5 text-xs sm:text-sm font-bold backdrop-blur hover:bg-white/30 transition">
              {myMerchant?.is_pro ? "จัดการแพ็กเกจ" : "⚡ อัปเกรด Pro (฿259)"}
            </Link>
          </div>
        </div>
      </div>

      <QuickActions onRescueCreated={() => setRescueRefreshKey((k) => k + 1)} />

      <MerchantRescueDealsSection refreshTrigger={rescueRefreshKey} />

      <div className="mb-6">
        <FlashSurgeCard />
      </div>

      <div className="mb-6">
        <StoryBoostStatCard />
      </div>

      <div className="mb-6">
        <RepeatRetentionCard />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="ภารกิจกำลังทำงาน" value={active} icon={Target} />
        <StatCard label="ลูกค้าเช็คอินสะสม" value={totalCheckins} icon={Users} />
        <StatCard label="รายได้ Off-peak (เดือนนี้)" value="฿18,400" trend={12} icon={Wallet} />
        <StatCard label="โควตา Push เหลือ" value="3/5" icon={Clock} />
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-3 font-semibold">ภารกิจล่าสุด</h3>
        {loading ? <div className="h-20 animate-pulse rounded-xl bg-muted" /> : (
          <div className="space-y-2">
            {quests.slice(0, 4).map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{q.title}</p>
                  <p className="text-xs text-muted-foreground">{q.start_time}-{q.end_time} · {q.merchant_name}</p>
                </div>
                <span className="text-xs font-medium">{q.participants || 0}/{q.capacity} สิทธิ์</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}