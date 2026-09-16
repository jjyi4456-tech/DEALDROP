import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import BillAuditModal from "@/components/admin/BillAuditModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Wallet, Receipt, TrendingUp, Landmark, ScanLine, ShieldCheck, ShieldAlert } from "lucide-react";
import { formatTHB, formatCompactTHB } from "@/lib/money";

const TYPE_META = {
  dine_in_bill: { label: "% ยอดบิล (Take-rate)", color: "#FF7A00", cls: "bg-orange-100 text-orange-700" },
  voucher_purchase: { label: "เวาเชอร์ / ดีล", color: "#8B5CF6", cls: "bg-violet-100 text-violet-700" },
  quest_boost: { label: "Boost เควสต์", color: "#06B6D4", cls: "bg-cyan-100 text-cyan-700" },
  season_pass: { label: "Season Pass", color: "#F59E0B", cls: "bg-amber-100 text-amber-700" },
  addon_push: { label: "Push เสริม", color: "#10B981", cls: "bg-emerald-100 text-emerald-700" },
};

const STATUS_CLASS = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  settled: "bg-sky-100 text-sky-700",
  rejected: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-600",
};

function MetricCard({ icon: Icon, tone, label, value, hint }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`h-9 w-9 rounded-xl ${tone} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Revenue command center: GMV / take-rate metrics, income-mix chart and the
// live AI receipt verification feed.
export default function AdminRevenueDashboard() {
  const [txs, setTxs] = useState(null);
  const [batches, setBatches] = useState(null);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const [t, b] = await Promise.all([
        base44.entities.Transaction.list("-created_date", 200),
        base44.entities.SettlementBatch.list("-created_date", 100),
      ]);
      setTxs(t);
      setBatches(b);
    } catch {
      toast({ title: "โหลดข้อมูลรายได้ไม่สำเร็จ", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    load();
    // Live feed: refresh on every transaction create/update/delete.
    const unsub = base44.entities.Transaction.subscribe(() => load());
    return unsub;
  }, [load]);

  const stats = useMemo(() => {
    const list = txs || [];
    const billable = list.filter((t) => ["verified", "settled"].includes(t.status));
    const totalGmv = billable.reduce((s, t) => s + (t.gross_amount || 0), 0);
    const netTake = billable.reduce((s, t) => s + (t.platform_fee || 0), 0);
    const pendingPayout = (batches || [])
      .filter((b) => ["pending", "approved"].includes(b.payout_status))
      .reduce((s, b) => s + (b.net_payout || 0), 0);
    const byType = {};
    for (const t of billable) byType[t.type] = (byType[t.type] || 0) + (t.platform_fee || 0);
    const breakdown = Object.entries(byType)
      .map(([type, value]) => ({
        name: TYPE_META[type]?.label || type,
        value: Math.round(value * 100) / 100,
        color: TYPE_META[type]?.color || "#94A3B8",
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return { totalGmv, netTake, txCount: list.length, pendingPayout, breakdown };
  }, [txs, batches]);

  const feed = (txs || []).slice(0, 8);

  const onUpdated = (updated) => {
    setTxs((prev) => (prev || []).map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setSelected(null);
  };

  return (
    <div>
      <PageHeader
        title="รายได้ & ส่วนแบ่ง"
        subtitle="ภาพรวม GMV, Take-rate และสายพานรายได้ทั้งหมดของแพลตฟอร์มแบบเรียลไทม์"
      />

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={TrendingUp}
          tone="bg-primary/10 text-primary"
          label="ยอดขายรวม (Total GMV)"
          value={formatCompactTHB(stats.totalGmv)}
          hint="เฉพาะบิลที่ผ่านการตรวจสอบแล้ว"
        />
        <MetricCard
          icon={Wallet}
          tone="bg-violet-100 text-violet-600"
          label="รายได้แพลตฟอร์มสุทธิ (Take)"
          value={formatCompactTHB(stats.netTake)}
          hint="ส่วนแบ่งรวมจากทุกช่องทาง"
        />
        <MetricCard
          icon={Receipt}
          tone="bg-cyan-100 text-cyan-600"
          label="ธุรกรรมทั้งหมด"
          value={String(stats.txCount)}
          hint="รวมบิลรอตรวจสอบและเคลียร์แล้ว"
        />
        <MetricCard
          icon={Landmark}
          tone="bg-amber-100 text-amber-600"
          label="ยอดรอเคลียร์ (Payout)"
          value={formatCompactTHB(stats.pendingPayout)}
          hint="รอบจ่ายเงินที่ยังไม่ได้โอนให้ร้าน"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {/* Income mix breakdown */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-1 font-semibold">สายพานรายได้ (Revenue Stream)</h3>
          <p className="mb-4 text-xs text-muted-foreground">สัดส่วนรายได้แพลตฟอร์มแยกตามช่องทาง</p>
          {txs === null ? (
            <Skeleton className="h-64 w-full" />
          ) : stats.breakdown.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              ยังไม่มีรายได้บันทึกในระบบ
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.breakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {stats.breakdown.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatTHB(v, 2)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* AI receipt verification live feed */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <ScanLine className="h-4 w-4 text-primary" />
                AI ตรวจบิลล่าสุด (Live)
              </h3>
              <p className="text-xs text-muted-foreground">คลิกเพื่อเปิดใบเสร็จต้นฉบับและตรวจสอบ</p>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="space-y-2">
            {txs === null &&
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            {txs !== null && feed.length === 0 && (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                ยังไม่มีบิลเข้าระบบ — รอผู้ใช้อัปโหลดใบเสร็จ
              </div>
            )}
            {feed.map((t) => {
              const conf = Number(t.ai_verification_data?.confidence) || 0;
              const meta = TYPE_META[t.type] || TYPE_META.dine_in_bill;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelected(t);
                    setModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border bg-background p-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <div className={`rounded-lg px-2 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label.split(" ")[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.merchant_name || "ไม่ระบุร้าน"}</p>
                    <p className="text-xs text-muted-foreground">{t.transaction_date || "-"} · เลขที่ {t.bill_number || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatTHB(t.gross_amount, 2)}</p>
                    <p className="text-xs text-muted-foreground">ค่า fee {formatTHB(t.platform_fee, 2)}</p>
                  </div>
                  <div className="flex w-20 flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        conf >= 90
                          ? "bg-emerald-100 text-emerald-700"
                          : conf >= 70
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {conf >= 70 ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                      {conf}%
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[t.status] || STATUS_CLASS.pending}`}>
                      {t.status === "verified" ? "ตรวจแล้ว" : t.status === "settled" ? "เคลียร์แล้ว" : t.status === "rejected" ? "ปฏิเสธ" : "รอตรวจ"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <BillAuditModal
        transaction={selected}
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setSelected(null);
        }}
        onUpdated={onUpdated}
      />
    </div>
  );
}