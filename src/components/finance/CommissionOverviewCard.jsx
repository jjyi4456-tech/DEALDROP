import { TrendingUp } from "lucide-react";

const pct = (r) => `${Math.round((r ?? 0) * 10000) / 100}%`;
const fmtBaht = (n) => `฿${(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const MONTHLY_EXAMPLE = 50000; // example GMV for the Pro saving estimate

// Overview card #3: commission rate (ปกติ 6% / Pro พิเศษ 3%)
export default function CommissionOverviewCard({ merchant, plans, onUpgrade }) {
  const baseRate = merchant?.commission_rate ?? 0.06;
  const activePlan = merchant?.active_plan_id ? plans.find((p) => p.id === merchant.active_plan_id) : null;
  const isPro = merchant?.is_pro || !!activePlan;
  const proRate = isPro ? (activePlan?.discounted_commission_rate ?? 0.03) : null;
  const nextPlan =
    plans.filter((p) => p.discounted_commission_rate != null).sort((a, b) => (a.price || 0) - (b.price || 0))[0] || null;
  const nextProRate = nextPlan?.discounted_commission_rate;

  return (
    <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">อัตราค่าคอมมิชชัน</p>
      <div className="mt-2 flex items-center gap-2">
        <p className={`text-3xl font-bold ${isPro ? "text-emerald-600" : ""}`}>{pct(isPro ? proRate : baseRate)}</p>
        {isPro ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">Pro พิเศษ</span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">ปกติ</span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {isPro
          ? `ต่อบิลที่รับคูปองสำเร็จ (ปกติ ${pct(baseRate)})`
          : `ต่อบิลที่รับคูปองสำเร็จ · ลดเหลือ ${pct(nextProRate)} เมื่ออัปเกรด Pro`}
      </p>
      {!isPro && nextProRate != null && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          ยอดรับคูปอง {fmtBaht(MONTHLY_EXAMPLE)}/เดือน → ประหยัด {fmtBaht(MONTHLY_EXAMPLE * (baseRate - nextProRate))}/เดือน
        </p>
      )}
      <div className="mt-auto pt-2">
        {isPro ? (
          <div className="w-full rounded-xl bg-emerald-50 py-2.5 text-center text-sm font-bold text-emerald-600">
            สิทธิ์ Pro ใช้งานอยู่ ✓
          </div>
        ) : nextPlan ? (
          <button
            onClick={() => onUpgrade(nextPlan)}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90"
          >
            อัปเกรดเป็น Pro
          </button>
        ) : null}
      </div>
    </div>
  );
}