import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, ShieldAlert, ScanLine, Store, CalendarDays, Hash, BadgeCheck } from "lucide-react";
import { formatTHB } from "@/lib/money";

const STATUS_LABEL = {
  pending: "รอตรวจสอบ",
  verified: "ตรวจสอบแล้ว",
  settled: "เคลียร์แล้ว",
  rejected: "ปฏิเสธ",
  refunded: "คืนเงิน",
};
const STATUS_CLASS = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  settled: "bg-sky-100 text-sky-700",
  rejected: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-600",
};

// Bill audit modal: shows the original receipt next to what the Vision AI
// extracted, lets the admin override the amount, then approve or reject.
export default function BillAuditModal({ transaction, open, onOpenChange, onUpdated }) {
  const [gross, setGross] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const ai = transaction?.ai_verification_data || {};
  const confidence = Math.max(0, Math.min(100, Number(ai.confidence) || 0));

  useEffect(() => {
    setGross(transaction ? String(transaction.gross_amount ?? "") : "");
  }, [transaction?.id, open]);

  if (!transaction) return null;

  const rate = Number(transaction.platform_rate) || 0;
  const g = Number(gross) || 0;
  const fee = Math.round(g * (rate / 100) * 100) / 100;
  const net = Math.round((g - fee) * 100) / 100;
  const locked = ["settled", "refunded"].includes(transaction.status);

  // Manual override → re-run the commission split locally, then approve/reject.
  const act = async (status) => {
    if (status === "verified" && (gross === "" || g <= 0)) {
      toast({ title: "กรุณากรอกยอดบิลให้ถูกต้อง", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const payload =
        status === "verified"
          ? {
              status,
              gross_amount: g,
              platform_fee: fee,
              net_merchant_amount: net,
              ai_verification_data: { ...ai, manual_override: true },
            }
          : { status };
      const updated = await base44.entities.Transaction.update(transaction.id, payload);
      toast({
        title: status === "verified" ? `อนุมัติบิลสำเร็จ — ส่วนแบ่ง ${formatTHB(fee, 2)}` : "ปฏิเสธบิลนี้แล้ว",
      });
      onUpdated?.({ ...transaction, ...payload, ...updated });
      onOpenChange?.(false);
    } catch {
      toast({ title: "บันทึกไม่สำเร็จ ลองอีกครั้ง", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange?.(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            ตรวจสอบใบเสร็จต้นฉบับ
          </DialogTitle>
          <DialogDescription>เทียบรูปใบเสร็จกับข้อมูลที่ AI สแกน แล้วอนุมัติ / แก้ยอด / ปฏิเสธ</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* ต้นฉบับใบเสร็จ */}
          <div className="overflow-hidden rounded-2xl border bg-muted/40">
            {transaction.receipt_image_url ? (
              <Image src={transaction.receipt_image_url} fittingType="fit" className="h-64 w-full" />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">ไม่มีรูปใบเสร็จ</div>
            )}
          </div>

          {/* ข้อมูลที่ AI สแกน */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">สถานะ</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[transaction.status]}`}>
                {STATUS_LABEL[transaction.status] || transaction.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Store className="h-4 w-4 text-muted-foreground" />
              {transaction.merchant_name || ai.merchant_name || "ไม่ระบุร้าน"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Hash className="h-4 w-4" />
              เลขที่บิล {transaction.bill_number || "-"}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {transaction.transaction_date || ai.bill_date || "-"}
            </div>

            {/* Confidence score */}
            <div className="rounded-xl border bg-background p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-medium">
                  {confidence >= 70 ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                  )}
                  ความน่าเชื่อถือของ AI
                </span>
                <span className="font-bold">{confidence}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${confidence >= 90 ? "bg-emerald-500" : confidence >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
              {ai.is_duplicate && (
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
                  <ShieldAlert className="h-4 w-4" /> ตรวจพบสลิปซ้ำ — สแกนรูปนี้มาก่อนแล้ว
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ยอดบิล + ส่วนแบ่ง */}
        <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">ยอดบิลจริง (แก้ไขได้)</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              disabled={locked || busy}
            />
          </div>
          <div className="flex flex-col justify-end">
            <span className="text-xs text-muted-foreground">ส่วนแบ่งแพลตฟอร์ม ({rate}%)</span>
            <span className="text-lg font-bold text-primary">{formatTHB(fee, 2)}</span>
          </div>
          <div className="flex flex-col justify-end">
            <span className="text-xs text-muted-foreground">ร้านค้ารับสุทธิ</span>
            <span className="text-lg font-bold">{formatTHB(net, 2)}</span>
          </div>
        </div>

        {!locked && (
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => act("rejected")}>
              ปฏิเสธบิล
            </Button>
            <Button disabled={busy} onClick={() => act("verified")}>
              <BadgeCheck className="h-4 w-4" />
              {busy ? "กำลังบันทึก..." : "อนุมัติบิลนี้"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}