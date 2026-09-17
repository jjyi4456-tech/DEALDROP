import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import ImageUpload from "@/components/shared/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, MapPin, Loader2, Store, QrCode } from "lucide-react";
import { shopQrPayload } from "@/lib/questTime";
import QuestManagementCard from "@/components/merchant/QuestManagementCard";
import InsightSummaryCard from "@/components/merchant/InsightSummaryCard";
import SubscriptionStatusCard from "@/components/merchant/SubscriptionStatusCard";
import StoryBoostSettingsCard from "@/components/merchant/StoryBoostSettingsCard";
import PartnerAgreementCard from "@/components/merchant/PartnerAgreementCard";

const CATEGORIES = [
  { value: "cafe", label: "คาเฟ่" },
  { value: "restaurant", label: "อาหารตามสั่ง" },
  { value: "beverage", label: "เครื่องดื่ม" },
  { value: "dessert", label: "ของหวาน" },
  { value: "bakery", label: "เบเกอรี่" },
];

export default function MerchantProfile() {
  const [merchant, setMerchant] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [editName, setEditName] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const list = await base44.entities.Merchant.list();
    const m = list[0] || null;
    setMerchant(m);
    setForm(m ? { ...m } : { name: "", category: "cafe", description: "", open_time: "08:00", close_time: "20:00", address: "", logo_url: "", cover_url: "" });
  };
  useEffect(() => {
    load();
  }, []);

  if (!form) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pinLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "ไม่รองรับ GPS", variant: "destructive" });
      return;
    }
    setPinning(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        toast({ title: "ปักหมุด GPS ใหม่แล้ว", description: `พิกัด ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
        setPinning(false);
      },
      () => {
        toast({ title: "ไม่สามารถระบุตำแหน่งได้", variant: "destructive" });
        setPinning(false);
      }
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      if (merchant?.id) {
        await base44.entities.Merchant.update(merchant.id, {
          name: form.name,
          category: form.category,
          description: form.description,
          open_time: form.open_time,
          close_time: form.close_time,
          address: form.address,
          lat: form.lat,
          lng: form.lng,
          logo_url: form.logo_url,
          cover_url: form.cover_url,
        });
      }
      toast({ title: "บันทึกข้อมูลเรียบร้อยแล้ว", description: "หน้าร้านดิจิทัลของคุณถูกอัปเดตแล้ว" });
      setEditName(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const onCover = (url) => setForm((f) => ({ ...f, cover_url: url }));
  const onLogo = (url) => setForm((f) => ({ ...f, logo_url: url }));

  return (
    <div className="space-y-0">
      <PageHeader title="หน้าร้านดิจิทัล" subtitle="จัดการหน้าร้านเพื่อดึงดูดลูกค้า" />

      {/* Cover + Logo */}
      <div className="relative mb-14">
        <ImageUpload value={form.cover_url} onChange={onCover} aspect="video" placeholderIcon={Store} className="border-0" />
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <ImageUpload value={form.logo_url} onChange={onLogo} shape="circle" className="h-24 w-24 border-4 border-background shadow-md" />
        </div>
      </div>

      {/* Shop details */}
      <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
        {/* Name */}
        <div className="space-y-1.5">
          <Label>ชื่อร้าน</Label>
          {editName ? (
            <Input value={form.name || ""} onChange={set("name")} placeholder="ชื่อร้านอาหาร" />
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold">{form.name || "ยังไม่ตั้งชื่อร้าน"}</p>
              <button onClick={() => setEditName(true)} className="rounded-lg p-2.5 text-primary hover:bg-primary/10">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label>หมวดหมู่ (F&B)</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  form.category === c.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="mp-desc">รายละเอียดร้าน</Label>
          <Textarea id="mp-desc" value={form.description || ""} onChange={set("description")} rows={3} placeholder="แนะนำเมนูเด็ดหรือจุดเด่นของร้าน" />
        </div>

        {/* Operating hours */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="mp-open">เวลาเปิด</Label>
            <Input id="mp-open" type="time" value={form.open_time || ""} onChange={set("open_time")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-close">เวลาปิด</Label>
            <Input id="mp-close" type="time" value={form.close_time || ""} onChange={set("close_time")} />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mp-address">ที่อยู่ร้าน</Label>
            <Input id="mp-address" value={form.address || ""} onChange={set("address")} placeholder="ระบุเลขที่ ซอย ถนน ตำบล อำเภอ จังหวัด" />
          </div>

          <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> พิกัดร้าน (ละติจูด, ลองจิจูด)
              </Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={pinLocation} 
                disabled={pinning} 
                className="h-8 border-primary/40 text-primary hover:bg-primary/10 text-xs"
              >
                {pinning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <MapPin className="mr-1.5 h-3.5 w-3.5" />}
                ดึงพิกัดจาก GPS ปัจจุบัน
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Latitude (ละติจูด)</span>
                <Input 
                  type="number" 
                  step="any"
                  placeholder="เช่น 13.7563" 
                  value={form.lat ?? ""} 
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value === "" ? null : parseFloat(e.target.value) }))} 
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Longitude (ลองจิจูด)</span>
                <Input 
                  type="number" 
                  step="any"
                  placeholder="เช่น 100.5018" 
                  value={form.lng ?? ""} 
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value === "" ? null : parseFloat(e.target.value) }))} 
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              💡 คุณสามารถกรอกตัวเลขพิกัดจาก Google Maps โดยตรง หรือกดปุ่ม &quot;ดึงพิกัดจาก GPS ปัจจุบัน&quot; เพื่อความแม่นยำในการเช็คอินของลูกค้า
            </p>
          </div>
        </div>
      </div>

      {/* 📸 Social + Story Boost settings */}
      <StoryBoostSettingsCard merchant={merchant} />

      {/* Quest Management */}
      <QuestManagementCard merchantId={merchant?.id} />

      {/* Insights summary */}
      <InsightSummaryCard merchantId={merchant?.id} />

      {/* Subscription status */}
      <SubscriptionStatusCard tier={merchant?.tier || "starter"} />

      {/* Partner agreement & commission terms (legal audit) */}
      <PartnerAgreementCard merchantId={merchant?.id} merchantName={merchant?.name} />

      {/* Shop QR (Double Lock) */}
      {merchant?.id && (
        <div className="mt-5 rounded-2xl border bg-card p-5 text-center shadow-sm">
          <div className="mb-1 flex items-center justify-center gap-2 font-semibold"><QrCode className="h-4 w-4 text-primary" /> QR Code ประจำร้าน (Double Lock)</div>
          <p className="text-xs text-muted-foreground">พิมพ์เป็นสแตนดี้ตั้งไว้ที่หน้าเคาน์เตอร์ · ลูกค้าต้องสแกนนี่พร้อมอยู่ในรัศมีร้านจึงจะเช็คอินได้</p>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=${encodeURIComponent(shopQrPayload(merchant.id))}`} alt="Shop QR" className="mx-auto mt-4 h-44 w-44 rounded-xl border bg-white p-2" />
          <p className="mt-2 font-mono text-xs text-muted-foreground">{shopQrPayload(merchant.id)}</p>
          <div className="mt-3 flex justify-center gap-2">
            <a href={`https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=12&data=${encodeURIComponent(shopQrPayload(merchant.id))}`} download="dealdrop-shop-qr.png" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">ดาวน์โหลด</a>
            <button onClick={() => window.print()} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent">พิมพ์</button>
          </div>
        </div>
      )}

      {/* Save */}
      <Button onClick={save} disabled={saving} className="mt-5 h-12 w-full text-base font-semibold">
        {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังบันทึก...</> : "อัปเดตหน้าร้าน"}
      </Button>
    </div>
  );
}