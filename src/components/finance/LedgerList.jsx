import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const fmtBaht = (n) => `฿${(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const TYPE_META = {
  topup: { label: "เติมเครดิต", cls: "bg-emerald-50 text-emerald-600", icon: ArrowDownLeft },
  commission_deduct: { label: "ค่าคอมมิชชัน", cls: "bg-orange-50 text-orange-600", icon: ArrowUpRight },
  refund: { label: "คืนเงิน", cls: "bg-sky-50 text-sky-600", icon: ArrowDownLeft },
  boost_fee: { label: "ค่าบูสต์เควสต์", cls: "bg-violet-50 text-violet-600", icon: ArrowUpRight },
  bonus: { label: "โบนัส", cls: "bg-emerald-50 text-emerald-600", icon: ArrowDownLeft },
};

export default function LedgerList({ rows }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="mb-3 font-semibold">Statement รายการย้อนหลัง (คอมมิชชัน + เติมเงิน)</h3>
      {rows.length === 0 ? (
        <div className="rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">
          ยังไม่มีรายการ — เมื่อรับคูปองหรือเติมเครดิต รายการจะแสดงที่นี่
        </div>
      ) : (
        <div className="divide-y">
          {rows.map((row) => {
            const meta = TYPE_META[row.type] || TYPE_META.commission_deduct;
            const Icon = meta.icon;
            const positive = (row.amount || 0) > 0;
            return (
              <div key={row.id} className="flex items-center gap-3 py-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.cls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                    <span className="text-[11px] text-muted-foreground">{fmtDate(row.created_date)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.description}</p>
                  {row.bill_amount != null && (
                    <p className="text-[11px] text-muted-foreground">
                      ยอดบิล {fmtBaht(row.bill_amount)} · ส่วนลด {fmtBaht(row.discount_amount)} · สุทธิ{" "}
                      {fmtBaht(row.final_customer_paid ?? Math.round(((row.bill_amount || 0) - (row.discount_amount || 0)) * 100) / 100)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${positive ? "text-emerald-600" : "text-orange-600"}`}>
                    {positive ? "+" : ""}{fmtBaht(row.amount)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">คงเหลือ {fmtBaht(row.balance_after)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}