import { Sparkles } from "lucide-react";

const fmtBaht = (n) => `฿${(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

// Overview card #2: current package (Free Tier / Pro Booster)
export default function PlanOverviewCard({ merchant, plans, onManagePlan }) {
  const activePlan = merchant?.active_plan_id ? plans.find((p) => p.id === merchant.active_plan_id) : null;
  const isPro = merchant?.is_pro || !!activePlan;

  return (
    <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">แพ็กเกจปัจจุบัน</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-3xl font-bold">{isPro ? "Pro Booster" : "Free Tier"}</p>
        {isPro && (
          <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-600">
            <Sparkles className="h-3 w-3" /> ใช้งานอยู่
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {isPro
          ? `${activePlan.name} · ${fmtBaht(activePlan.price)}/เดือน · เครดิตบูสต์เควสต์ ${activePlan.boost_credits_per_month || 0} ครั้ง/เดือน`
          : "จ่ายต่อบิลสำเร็จ (Pay-per-Success) · ไม่มีค่ารายเดือนบังคับ"}
      </p>
      <button onClick={onManagePlan} className="mt-auto w-full rounded-xl border bg-card py-2.5 text-sm font-bold transition hover:bg-accent">
        {isPro ? "จัดการแพ็กเกจ" : "ดูแพ็กเกจ Pro Booster"}
      </button>
    </div>
  );
}