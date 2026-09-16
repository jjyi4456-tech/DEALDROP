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

export default function MerchantDashboard() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setQuests(await base44.entities.Quest.list("-quest_date", 50)); }
      finally { setLoading(false); }
    })();
  }, []);

  const active = quests.filter((q) => q.status === "active").length;
  const totalCheckins = quests.reduce((s, q) => s + (q.participants || 0), 0);

  return (
    <div>
      <PageHeader title="หน้าหลักร้าน" subtitle="ภาพรวมการดำเนินงานและสถานะแพ็กเกจของคุณ"
        action={<Link to="/merchant/finance" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">จัดการแพ็กเกจ</Link>} />

      <div className="mb-6 rounded-2xl bg-primary p-6 text-primary-foreground">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm opacity-90">แพ็กเกจปัจจุบัน</p>
            <p className="text-3xl font-bold">Growth · ฿299/เดือน</p>
            <p className="mt-1 text-sm opacity-80">ต่ออายุอัตโนมัติ 17 ส.ค. 2026 · เหลือ 4 วัน</p>
          </div>
          <div className="flex gap-2">
            <Link to="/merchant/finance" className="rounded-xl bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/30">อัปเกรด</Link>
            <Link to="/merchant/finance" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-white/90">ซื้อ Add-on</Link>
          </div>
        </div>
      </div>

      <QuickActions />

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