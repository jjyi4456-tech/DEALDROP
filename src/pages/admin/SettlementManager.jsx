import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Landmark, CheckCircle2, Paperclip, Download, RefreshCw } from "lucide-react";
import { formatTHB, formatThaiDate } from "@/lib/money";

const PAYOUT_META = {
  pending: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "อนุมัติแล้ว", cls: "bg-sky-100 text-sky-700" },
  paid: { label: "จ่ายแล้ว", cls: "bg-emerald-100 text-emerald-700" },
  failed: { label: "โอนไม่สำเร็จ", cls: "bg-red-100 text-red-700" },
};

// Payout management: monthly settlement batches per merchant — approve, attach
// the transfer slip, export to CSV. The "ตัดรอบ" button triggers the same
// settlement function the monthly workflow runs.
export default function SettlementManager() {
  const [batches, setBatches] = useState(null);
  const [running, setRunning] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = useRef(null);
  const pendingBatchRef = useRef(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      setBatches(await base44.entities.SettlementBatch.list("-created_date", 100));
    } catch {
      toast({ title: "โหลดรอบตัดบิลไม่สำเร็จ", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const runSettlement = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("generateMonthlySettlement", {});
      const data = res.data || {};
      toast({
        title: `ตัดรอบสำเร็จ — สร้าง ${data.batches_created ?? 0} รอบจ่าย จาก ${data.transactions_settled ?? 0} บิล`,
      });
      await load();
    } catch {
      toast({ title: "ตัดรอบไม่สำเร็จ ลองอีกครั้ง", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const approvePayout = async (b) => {
    try {
      await base44.entities.SettlementBatch.update(b.id, { payout_status: "approved" });
      toast({ title: `อนุมัติรอบจ่าย “${b.merchant_name}” แล้ว` });
      await load();
    } catch {
      toast({ title: "อนุมัติไม่สำเร็จ", variant: "destructive" });
    }
  };

  // Attach the bank transfer slip, then mark the batch as paid.
  const pickSlip = (b) => {
    pendingBatchRef.current = b;
    fileInputRef.current?.click();
  };

  const onSlipFile = async (e) => {
    const file = e.target.files?.[0];
    const b = pendingBatchRef.current;
    e.target.value = "";
    pendingBatchRef.current = null;
    if (!file || !b) return;
    setUploadingId(b.id);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.entities.SettlementBatch.update(b.id, {
        payout_status: "paid",
        slip_url: file_url,
        paid_date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date()),
      });
      toast({ title: `บันทึกสลิปและปิดรอบจ่าย “${b.merchant_name}” เรียบร้อย` });
      await load();
    } catch {
      toast({ title: "อัปโหลดสลิปไม่สำเร็จ", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  // CSV export (UTF-8 BOM so Excel reads Thai correctly).
  const exportCSV = () => {
    const rows = [
      ["ร้านค้า", "งวดตัดรอบ", "GMV", "คอมมิชชั่นแพลตฟอร์ม", "โอนสุทธิ", "จำนวนบิล", "สถานะ"],
      ...(batches || []).map((b) => [
        b.merchant_name,
        `${b.period_start} ถึง ${b.period_end}`,
        b.total_gmv ?? 0,
        b.total_commission ?? 0,
        b.net_payout ?? 0,
        b.transaction_count ?? 0,
        PAYOUT_META[b.payout_status]?.label || b.payout_status,
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `settlement-batches-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="ตัดรอบจ่ายเงิน (Settlement)"
        subtitle="อนุมัติรอบโอนเงินให้ร้านค้า แนบหลักฐานการโอน และส่งออกรายงาน"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!batches?.length}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={runSettlement} disabled={running}>
              <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
              {running ? "กำลังตัดรอบ..." : "ตัดรอบเดือนล่าสุด"}
            </Button>
          </div>
        }
      />

      {/* hidden file input for payout slips */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onSlipFile} />

      {batches === null ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border text-sm text-muted-foreground">
          <Landmark className="h-8 w-8" />
          ยังไม่มีรอบตัดบิล — กด “ตัดรอบเดือนล่าสุด” เพื่อสร้างรอบจ่ายเงิน
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => {
            const meta = PAYOUT_META[b.payout_status] || PAYOUT_META.pending;
            return (
              <div key={b.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-[170px] flex-1">
                    <p className="font-semibold">{b.merchant_name || "ร้านค้า"}</p>
                    <p className="text-xs text-muted-foreground">
                      งวด {formatThaiDate(b.period_start)} – {formatThaiDate(b.period_end)} · {b.transaction_count} บิล
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">GMV</p>
                    <p className="font-semibold">{formatTHB(b.total_gmv)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">คอมมิชชั่น</p>
                    <p className="font-semibold text-primary">{formatTHB(b.total_commission, 2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">โอนสุทธิ</p>
                    <p className="text-lg font-bold">{formatTHB(b.net_payout)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>

                  {/* Actions by state */}
                  {b.payout_status === "pending" && (
                    <Button size="sm" onClick={() => approvePayout(b)}>
                      <CheckCircle2 className="h-4 w-4" /> อนุมัติรอบจ่าย
                    </Button>
                  )}
                  {b.payout_status === "approved" && (
                    <Button size="sm" variant="outline" disabled={uploadingId === b.id} onClick={() => pickSlip(b)}>
                      <Paperclip className="h-4 w-4" />
                      {uploadingId === b.id ? "กำลังอัปโหลด..." : "แนบสลิป & ยืนยันจ่ายแล้ว"}
                    </Button>
                  )}
                  {b.payout_status === "paid" && b.slip_url && (
                    <a
                      href={b.slip_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary underline underline-offset-2"
                    >
                      ดูสลิปการโอน
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