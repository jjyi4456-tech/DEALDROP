import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import { Megaphone, CalendarClock, Play, Pause, CheckCircle2, XCircle, Bell } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS = {
  pending: { label: "รออนุมัติ", cls: "bg-amber-50 text-amber-600" },
  scheduled: { label: "ตั้งคิวแล้ว", cls: "bg-blue-50 text-blue-600" },
  active: { label: "กำลังแสดง", cls: "bg-emerald-50 text-emerald-600" },
  ended: { label: "สิ้นสุด/ปฏิเสธ", cls: "bg-muted text-muted-foreground" },
};
const REASONS = ["รูปภาพไม่คมชัด", "เนื้อหาผิดหมวดหมู่ (ไม่ใช่ F&B)", "โปรโมชันไม่ถูกต้อง", "สัดส่วนภาพไม่ตรงมาตรฐาน", "อื่นๆ"];

export default function AdsManagement() {
  const [ads, setAds] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const load = async () => {
    try {
      setAds(await base44.entities.BannerAd.list("-start_date", 50));
      setSlots(await base44.entities.AdSlot.list());
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const unsub = base44.entities.BannerAd.subscribe(() => load());
    return unsub;
  }, []);

  const pendingCount = useMemo(() => ads.filter((a) => a.status === "pending").length, [ads]);

  const setStatus = async (ad, status) => {
    await base44.entities.BannerAd.update(ad.id, { status });
    toast({ title: "อัปเดตสถานะแบนเนอร์แล้ว" });
    load();
  };

  const confirmReject = async () => {
    if (!reason) { toast({ title: "กรุณาเลือกเหตุผล", variant: "destructive" }); return; }
    await base44.entities.BannerAd.update(rejecting.id, { status: "ended", reject_reason: reason });
    const refund = rejecting.paid ? ` · คืนโควตา/เงิน ฿${rejecting.price || 199} ให้ร้านค้าแล้ว` : "";
    toast({ title: "ปฏิเสธแบนเนอร์แล้ว", description: `ส่งแจ้งเตือนไปยังร้านค้า${refund}` });
    setRejecting(null);
    setReason("");
    load();
  };

  return (
    <div>
      <div className="relative mb-6">
        <PageHeader title="จัดการโฆษณา & รายได้" subtitle="ตรวจสอบแบนเนอร์ที่ร้านค้าส่งคำขอ อนุมัติ/ปฏิเสธ และคิวแสดงผล" />
        {pendingCount > 0 && (
          <span className="absolute right-0 top-0 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white animate-pulse">
            <Bell className="h-3.5 w-3.5" /> {pendingCount} รอตรวจ
          </span>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {slots.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-2xl border bg-card p-5">
            <div>
              <p className="font-semibold">{s.slot_name}</p>
              <p className="text-xs text-muted-foreground">{s.duration_days} วัน · ตำแหน่ง {s.position === "top_banner" ? "บนสุดหน้าแรก" : s.position}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">฿{(s.price || 0).toLocaleString()}</p>
              <span className={`text-xs font-medium ${s.tier === "premium" ? "text-amber-600" : "text-blue-600"}`}>{s.tier === "premium" ? "Premium" : "Basic"}</span>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-3 font-semibold">คิวแบนเนอร์ที่ร้านค้าสั่งซื้อ</h3>
      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                {ad.image_url ? (
                  <img src={ad.image_url} alt="" className="h-14 w-24 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-24 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white"><Megaphone className="h-5 w-5" /></div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{ad.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[ad.status].cls}`}>{STATUS[ad.status].label}</span>
                    {ad.paid && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">ชำระแล้ว</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{ad.merchant_name} · ฿{ad.price || 0}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {ad.start_date} → {ad.end_date}</p>
                  {ad.status === "ended" && ad.reject_reason && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3 w-3" /> {ad.reject_reason}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ad.status === "pending" && (
                  <>
                    <button onClick={() => setStatus(ad, "scheduled")} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> อนุมัติ</button>
                    <button onClick={() => { setRejecting(ad); setReason(""); }} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><XCircle className="h-3.5 w-3.5" /> ปฏิเสธ</button>
                  </>
                )}
                {ad.status === "scheduled" && <button onClick={() => setStatus(ad, "active")} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Play className="h-3.5 w-3.5" /> เริ่มแสดง</button>}
                {ad.status === "active" && <button onClick={() => setStatus(ad, "ended")} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><Pause className="h-3.5 w-3.5" /> หยุด</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setRejecting(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 font-semibold">ปฏิเสธแบนเนอร์</h3>
            <p className="mb-3 text-xs text-muted-foreground">เลือกเหตุผลเพื่อส่งแจ้งเตือนกลับร้านค้า{rejecting.paid ? " (ระบบจะคืนโควตา/เงินอัตโนมัติ)" : ""}</p>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm ${reason === r ? "border-red-300 bg-red-50 text-red-600" : "hover:bg-accent"}`}>
                  {reason === r ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border" />} {r}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setRejecting(null)} className="flex-1 rounded-xl border py-2 text-sm font-medium hover:bg-accent">ยกเลิก</button>
              <button onClick={confirmReject} className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600">ยืนยันปฏิเสธ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}