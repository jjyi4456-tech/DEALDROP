import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import { Store, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const STATUS = {
  pending: { label: "รอตรวจสอบ", cls: "bg-amber-50 text-amber-600" },
  approved: { label: "อนุมัติแล้ว", cls: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "ปฏิเสธ", cls: "bg-red-50 text-red-600" },
  suspended: { label: "ระงับ", cls: "bg-red-50 text-red-600" },
};

const TABS = ["pending", "approved", "suspended", "rejected", "all"];

export default function MerchantManagement() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Merchant.list("-created_date", 100);
      setMerchants(all);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = merchants.filter((m) => (filter === "all" ? true : m.status === filter));

  const toggle = async (m, on) => {
    await base44.entities.Merchant.update(m.id, { status: on ? "approved" : "suspended" });
    // Promote/demote the shop owner's role to match (admin can update users)
    if (m.created_by_id) {
      await base44.entities.User.update(m.created_by_id, { role: on ? "merchant" : "user" }).catch(() => {});
    }
    toast({ title: on ? "อนุมัติร้านค้าแล้ว" : "ระงับร้านค้าแล้ว", description: `${m.name} · สถานะบัญชี: ${on ? "merchant" : "user"}` });
    load();
  };
  const doReject = async () => {
    if (!reason.trim()) return;
    await base44.entities.Merchant.update(rejectTarget.id, { status: "rejected", reject_reason: reason });
    if (rejectTarget.created_by_id) {
      await base44.entities.User.update(rejectTarget.created_by_id, { role: "user" }).catch(() => {});
    }
    setRejectTarget(null);
    setReason("");
    toast({ title: "ปฏิเสธร้านค้าแล้ว" });
    load();
  };

  return (
    <div>
      <PageHeader title="จัดการร้านค้า (KYC)" subtitle="ตรวจสอบและอนุมัติร้านอาหาร/คาเฟ่ที่สมัครเข้ามา" />

      <div className="mb-4 flex gap-2">
        {TABS.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-accent"}`}>
            {s === "all" ? "ทั้งหมด" : STATUS[s].label}
            <span className="ml-1.5 text-xs opacity-60">({merchants.filter((m) => s === "all" || m.status === s).length})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="hidden grid-cols-12 gap-3 border-b bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <div className="col-span-5">ร้านค้า</div>
            <div className="col-span-3">เจ้าของ</div>
            <div className="col-span-2">แพ็กเกจ</div>
            <div className="col-span-2 text-right">เปิด/ปิด</div>
          </div>
          <div className="divide-y">
            {filtered.map((m) => (
              <div key={m.id} className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-12 md:items-center">
                <div className="flex items-start gap-3 md:col-span-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Store className="h-5 w-5 text-primary" /></div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{m.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.category} · {m.address || "—"}</p>
                    {m.reject_reason && <p className="mt-0.5 text-xs text-red-500">เหตุผล: {m.reject_reason}</p>}
                  </div>
                </div>
                <div className="text-sm md:col-span-3">
                  <p className="font-medium">{m.owner_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="text-sm capitalize text-muted-foreground md:col-span-2">{m.tier || "starter"}</div>
                <div className="flex items-center justify-between md:col-span-2 md:justify-end">
                  {m.status === "pending" && (
                    <button onClick={() => setRejectTarget(m)} className="text-xs font-medium text-red-500 hover:underline">ปฏิเสธ</button>
                  )}
                  {m.status !== "rejected" ? (
                    <Switch checked={m.status === "approved"} onCheckedChange={(on) => toggle(m, on)} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-5 py-12 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
                ไม่มีร้านค้าในสถานะนี้
              </div>
            )}
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold">ปฏิเสธร้านค้า: {rejectTarget.name}</h3>
            <p className="mb-3 text-sm text-muted-foreground">กรุณาระบุเหตุผลในการปฏิเสธ</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="เช่น เอกสารไม่ครบถ้วน กรุณาอัปโหลดใบอนุญาตร้านอาหาร..." className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectTarget(null)} className="rounded-xl border px-4 py-2 text-sm hover:bg-accent">ยกเลิก</button>
              <button onClick={doReject} disabled={!reason.trim()} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">ยืนยันปฏิเสธ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}