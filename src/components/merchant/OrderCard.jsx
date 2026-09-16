import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const ORDER_STATUS = {
  pending: { label: "รอยืนยัน", cls: "bg-amber-100 text-amber-700" },
  preparing: { label: "กำลังทำ", cls: "bg-blue-100 text-blue-700" },
  served: { label: "เสิร์ฟแล้ว", cls: "bg-emerald-100 text-emerald-700" },
  completed: { label: "เสร็จสิ้น", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "ยกเลิก", cls: "bg-red-100 text-red-600" },
};

const NEXT = {
  pending: { to: "preparing", label: "รับออเดอร์", cls: "bg-emerald-500 hover:bg-emerald-600" },
  preparing: { to: "served", label: "เสิร์ฟแล้ว", cls: "" },
};

// "สั่งเมื่อ X นาทีที่แล้ว" — re-renders every 30s while the card is mounted
function useElapsedMinutes(createdDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!createdDate) return null;
  const mins = Math.max(0, Math.floor((now - new Date(createdDate).getTime()) / 60000));
  return mins;
}

export default function OrderCard({ order, onStatus, onComplete, completing, commissionRate = 0.06 }) {
  const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
  const next = NEXT[order.status];
  const elapsed = useElapsedMinutes(order.created_date);
  const time = order.created_date
    ? new Date(order.created_date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : "";

  const gross = order.total_amount != null ? order.total_amount : order.total;
  const discount = order.discount_amount || 0;
  const net = order.net_paid != null ? order.net_paid : Math.max(0, gross - discount);
  const estFee = Math.round(net * commissionRate * 100) / 100;
  const isCompleting = completing === order.id;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-foreground">
              🪑 {order.table_no || "Pick-up"}
            </span>
            <p className="truncate text-sm font-bold">{order.user_name || "ลูกค้า"}</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            #{(order.id || "").slice(-6).toUpperCase()} · {time}
            {elapsed != null && (
              <span className={`ml-1 font-bold ${elapsed >= 15 ? "text-red-500" : elapsed >= 5 ? "text-amber-600" : ""}`}>
                · สั่งเมื่อ {elapsed} นาทีที่แล้ว
              </span>
            )}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
      </div>

      <div className="mt-3 space-y-1">
        {(order.items || []).map((it, idx) => (
          <div key={idx}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{it.name} × {it.quantity}</span>
              <span className="text-muted-foreground">฿{it.price * it.quantity}</span>
            </div>
            {it.note && (
              <p className="ml-4 rounded-lg bg-amber-50 px-2 py-0.5 text-xs text-amber-700">📝 {it.note}</p>
            )}
          </div>
        ))}
      </div>
      {order.note && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-700">📝 โน้ตรวม: {order.note}</p>}

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <p className="text-sm font-bold">รวม ฿{gross}</p>
        {order.status !== "completed" && order.status !== "cancelled" && (
          <div className="flex gap-2">
            {order.status === "pending" && (
              <Button size="sm" variant="outline" className="text-red-500" onClick={() => onStatus(order, "cancelled")}>
                ยกเลิก
              </Button>
            )}
            {next && (
              <Button size="sm" className={next.cls} onClick={() => onStatus(order, next.to)}>
                {next.label}
              </Button>
            )}
          </div>
        )}
      </div>

      {order.status === "served" && (
        <div className="mt-3 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ส่วนลดคูปอง</span>
            <span className="font-bold text-emerald-600">-฿{discount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold">ยอดสุทธิที่ต้องเก็บจากลูกค้า</span>
            <span className="text-base font-extrabold text-primary">฿{net}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">ค่าบริการ DEALDROP ({Math.round(commissionRate * 100)}%) หักจากกระเป๋าเงิน</span>
            <span className="font-semibold text-muted-foreground">-฿{estFee}</span>
          </div>
          <Button
            onClick={() => onComplete(order)}
            disabled={isCompleting}
            className="w-full rounded-xl py-3 text-sm font-bold"
          >
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันรับชำระเงิน & ปิดบิล (Complete Order)"}
          </Button>
        </div>
      )}
    </div>
  );
}