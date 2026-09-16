import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { Megaphone, ImagePlus, CalendarClock, Loader2, Coins, XCircle, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const STATUS = {
  pending: { label: "รออนุมัติ", cls: "bg-amber-50 text-amber-600" },
  scheduled: { label: "ตั้งคิวแล้ว", cls: "bg-blue-50 text-blue-600" },
  active: { label: "กำลังแสดง", cls: "bg-emerald-50 text-emerald-600" },
  ended: { label: "สิ้นสุด/ปฏิเสธ", cls: "bg-muted text-muted-foreground" },
};
const ADDON_PRICE = 199;

export default function BannerManager() {
  const [merchant, setMerchant] = useState(null);
  const [plan, setPlan] = useState(null);
  const [quests, setQuests] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", image_url: "", quest_id: "", start_date: "", end_date: "" });
  const { toast } = useToast();

  const load = async () => {
    try {
      const user = await base44.auth.me();
      const ms = await base44.entities.Merchant.filter({ email: user.email }, undefined, 1);
      const m = ms[0];
      setMerchant(m);
      if (m) {
        const [qs, bs, plans] = await Promise.all([
          base44.entities.Quest.filter({ merchant_id: m.id, status: "active" }, "-quest_date", 50),
          base44.entities.BannerAd.filter({ merchant_id: m.id }, "-start_date", 50),
          base44.entities.SubscriptionPlan.list("price", 10),
        ]);
        setQuests(qs);
        setBanners(bs);
        setPlan(plans.find((p) => p.code === m.tier) || plans[0]);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const quota = plan?.banner_days || 0;
  const usedThisMonth = useMemo(() => {
    const now = new Date();
    return banners.filter((b) => {
      const d = new Date(b.created_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && b.status !== "ended";
    }).length;
  }, [banners]);
  const remaining = Math.max(0, quota - usedThisMonth);
  const needBuy = remaining <= 0;

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setForm((s) => ({ ...s, image_url: file_url }));
    } catch {
      toast({ title: "อัปโหลดไม่สำเร็จ", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const valid = form.title && form.image_url && form.quest_id && form.start_date && form.end_date && new Date(form.end_date) >= new Date(form.start_date);

  const submit = async () => {
    if (!valid) { toast({ title: "กรุณากรอกข้อมูลให้ครบ และวันที่ถูกต้อง", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      await base44.entities.BannerAd.create({
        merchant_id: merchant.id,
        merchant_name: merchant.name,
        title: form.title,
        image_url: form.image_url,
        quest_id: form.quest_id,
        start_date: form.start_date,
        end_date: form.end_date,
        tier: merchant.tier === "premium" ? "premium" : "basic",
        price: needBuy ? ADDON_PRICE : 0,
        status: "pending",
        paid: needBuy,
        position: "top",
      });
      toast({
        title: needBuy ? `ชำระ ฿${ADDON_PRICE} สำเร็จ · ส่งคำขอแล้ว` : "ส่งคำขอแบนเนอร์แล้ว",
        description: "รอแอดมินตรวจสอบ",
      });
      setForm({ title: "", image_url: "", quest_id: "", start_date: "", end_date: "" });
      load();
    } catch {
      toast({ title: "ส่งคำขอไม่สำเร็จ", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="สร้างแบนเนอร์โปรโมต" subtitle="อัปโหลดแบนเนอร์ ผูกภารกิจเป้าหมาย และส่งให้แอดมินอนุมัติ" />

      {/* Quota card */}
      <div className="mb-5 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Megaphone className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">โควตาแบนเนอร์ ({plan?.name || "-"})</p>
              <p className="font-bold">{remaining} / {quota} สิทธิ์ที่เหลือในเดือนนี้</p>
            </div>
          </div>
          {needBuy && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">ใช้สิทธิ์ครบ · ต้องซื้อ Add-on</span>}
        </div>
      </div>

      {/* Create form */}
      <div className="mb-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-4 font-semibold">รายละเอียดแบนเนอร์</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">ชื่อแคมเปญ</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น โปรเช็คอินรับโบนัส 50%" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">รูปภาพแบนเนอร์ (ล็อกอัตราส่วน 16:9)</label>
            <label className="flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/40">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                  <span className="text-xs">{uploading ? "กำลังอัปโหลด..." : "คลิกอัปโหลดรูป (16:9)"}</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">ภารกิจเป้าหมาย</label>
            <Select value={form.quest_id} onValueChange={(v) => setForm({ ...form, quest_id: v })}>
              <SelectTrigger className="h-10 w-full rounded-xl text-sm">
                <SelectValue placeholder="-- เลือกภารกิจ --" />
              </SelectTrigger>
              <SelectContent>
                {quests.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {quests.length === 0 && <p className="mt-1 text-xs text-muted-foreground">ยังไม่มีภารกิจที่ใช้งาน กรุณาสร้างภารกิจก่อน</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">แสดงตั้งแต่</label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ถึง</label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <button onClick={submit} disabled={!valid || submitting} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${valid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : needBuy ? <><Coins className="h-4 w-4" /> ชำระ ฿{ADDON_PRICE} และส่งคำขอ</> : <>ส่งคำขออนุมัติ</>}
          </button>
          {needBuy && <p className="text-center text-xs text-muted-foreground">ไม่มีโควตาเหลือ · ชำระผ่าน Stripe เพื่อซื้อพื้นที่โฆษณาเพิ่ม (จำลอง)</p>}
        </div>
      </div>

      {/* My banners */}
      <h3 className="mb-3 font-semibold">แบนเนอร์ของฉัน</h3>
      <div className="space-y-3">
        {banners.length === 0 && <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">ยังไม่มีแบนเนอร์</div>}
        {banners.map((b) => (
          <div key={b.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{b.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[b.status].cls}`}>{STATUS[b.status].label}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {b.start_date} → {b.end_date}</span>
              {b.paid && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-600">ซื้อ Add-on ฿{b.price}</span>}
            </div>
            {b.status === "ended" && b.reject_reason && (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 p-2 text-xs text-red-600"><XCircle className="mt-0.5 h-3.5 w-3.5" /> ปฏิเสธ: {b.reject_reason}</div>
            )}
            {b.status === "scheduled" && <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> อนุมัติแล้ว · รอแสดงผลตามวันที่</div>}
          </div>
        ))}
      </div>
    </div>
  );
}