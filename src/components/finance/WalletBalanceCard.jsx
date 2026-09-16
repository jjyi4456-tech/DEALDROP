import { CreditCard, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";

const fmtBaht = (n) => `฿${(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

// Overview card #1: prepaid wallet balance with low-credit warning (< ฿50).
export default function WalletBalanceCard({ wallet, onOpenTopup }) {
  const negative = wallet < 0;
  const low = !negative && wallet < 50;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ยอดเงินเครดิตคงเหลือ (Prepaid Wallet)</p>
      <p className={`mt-2 text-5xl font-bold tracking-tight ${negative ? "text-red-600" : ""}`}>{fmtBaht(wallet)}</p>

      {/* Credit status bar */}
      <div
        className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
          negative ? "bg-red-50 text-red-600" : low ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {negative ? (
          <ShieldAlert className="h-4 w-4 shrink-0" />
        ) : low ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <ShieldCheck className="h-4 w-4 shrink-0" />
        )}
        {negative
          ? "ค้างชำระ — ร้านรับคูปองถัดไปไม่ได้จนกว่าจะเติมเงิน"
          : low
            ? "เครดิตเหลือน้อยกว่า ฿50 — กรุณาเติมเครดิตก่อนรับคูปองถัดไป"
            : "พร้อมเปิดรับเควสต์ — เครดิตเพียงพอสำหรับตัดค่าคอมมิชชัน"}
      </div>

      <button
        onClick={onOpenTopup}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition active:scale-95 hover:bg-primary/90"
      >
        <CreditCard className="h-5 w-5" /> เติมเครดิต (Top-up)
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">ตัดอัตโนมัติเมื่อปิดบิลคูปองสำเร็จ (Pay-per-Success)</p>
    </div>
  );
}