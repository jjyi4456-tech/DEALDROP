import { Receipt, ExternalLink, Loader2, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

const fmtMoney = (amount, currency) => {
  const cur = (currency || "thb").toUpperCase();
  const val = (amount || 0) / 100;
  if (cur === "THB") return `฿${val.toLocaleString()}`;
  return `${val.toLocaleString()} ${cur}`;
};
const fmtDate = (ts) =>
  ts ? new Date(ts * 1000).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS = {
  paid: { label: "ชำระแล้ว", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600" },
  open: { label: "รอชำระ", icon: Clock, cls: "bg-amber-50 text-amber-600" },
  void: { label: "ยกเล็ก", icon: XCircle, cls: "bg-slate-100 text-slate-500" },
  uncollectible: { label: "เรียกเก็บไม่ได้", icon: AlertCircle, cls: "bg-red-50 text-red-600" },
};

// Invoice history (Stripe billing) — the receipt part of the Ledger & History tab.
// The portal-opening action is owned by the Finance page (single source of truth).
export default function InvoicesPanel({ billing, loading, onOpenPortal, portalLoading }) {
  const invoices = billing?.invoices || [];

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <Receipt className="h-4 w-4" /> ประวัติใบแจ้งหนี้ (Stripe)
        </h3>
        {billing?.has_customer && (
          <button
            onClick={onOpenPortal}
            disabled={portalLoading || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition hover:bg-accent disabled:opacity-60"
          >
            {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            จัดการวิธีการชำระเงิน
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !billing?.has_customer ? (
        <div className="rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">
          ยังไม่มีประวัติการชำระบนระบบสมาชิกอัตโนมัติ — สมัครแพ็กเกจรายเดือนในแท็บ “แพ็กเกจและสิทธิประโยชน์”
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">ยังไม่มีใบแจ้งหนี้</div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {invoices.map((inv, idx) => {
            const st = STATUS[inv.status] || { label: inv.status, icon: AlertCircle, cls: "bg-slate-100 text-slate-500" };
            return (
              <div key={inv.id} className={`flex items-center justify-between gap-3 p-4 ${idx > 0 ? "border-t" : ""}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{inv.number || inv.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(inv.created)} ·{" "}
                    {inv.status === "paid" ? fmtMoney(inv.amount_paid, inv.currency) : fmtMoney(inv.amount_due, inv.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>
                    <st.icon className="h-3 w-3" />
                    {st.label}
                  </span>
                  {inv.invoice_pdf && (
                    <a href={inv.invoice_pdf} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
                      PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}