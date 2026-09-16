import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Target, Plus, ChevronRight, Loader2 } from "lucide-react";

// Quest management dashboard summary for the merchant profile: counts of
// active/ended/draft quests plus a shortcut into the Quest Builder.
const STATUS_LABEL = {
  active: { label: "กำลังดำเนินการ", cls: "bg-emerald-50 text-emerald-600" },
  completed: { label: "สิ้นสุดแล้ว", cls: "bg-muted text-muted-foreground" },
  expired: { label: "หมดอายุ", cls: "bg-red-50 text-red-500" },
  draft: { label: "ฉบับร่าง", cls: "bg-amber-50 text-amber-600" },
};

export default function QuestManagementCard({ merchantId }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantId) { setLoading(false); return; }
    (async () => {
      try {
        setQuests(await base44.entities.Quest.filter({ merchant_id: merchantId }, "-quest_date", 20));
      } catch {
        setQuests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  const counts = {
    active: quests.filter((q) => q.status === "active").length,
    ended: quests.filter((q) => q.status === "completed" || q.status === "expired").length,
    draft: quests.filter((q) => q.status === "draft").length,
  };

  return (
    <div className="mt-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">จัดการภารกิจ</h3>
        </div>
        <Link to="/merchant/quests" className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> สร้างภารกิจ
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-50 p-2"><p className="text-lg font-bold text-emerald-600">{counts.active}</p><p className="text-xs text-muted-foreground">กำลังดำเนินการ</p></div>
        <div className="rounded-xl bg-muted/50 p-2"><p className="text-lg font-bold">{counts.ended}</p><p className="text-xs text-muted-foreground">สิ้นสุดแล้ว</p></div>
        <div className="rounded-xl bg-amber-50 p-2"><p className="text-lg font-bold text-amber-600">{counts.draft}</p><p className="text-xs text-muted-foreground">ฉบับร่าง</p></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {quests.slice(0, 4).map((q) => (
            <Link key={q.id} to="/merchant/quests" className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 hover:bg-muted/60">
              <div>
                <p className="text-sm font-medium leading-tight">{q.title}</p>
                <p className="text-xs text-muted-foreground">{q.start_time}-{q.end_time} · {q.quest_date}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABEL[q.status]?.cls || "bg-muted"}`}>{STATUS_LABEL[q.status]?.label || q.status}</span>
            </Link>
          ))}
          {quests.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">ยังไม่มีภารกิจ · กด "สร้างภารกิจ" เพื่อเริ่ม</p>}
          {quests.length > 4 && (
            <Link to="/merchant/quests" className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-primary hover:underline">
              ดูทั้งหมด {quests.length} ภารกิจ <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}