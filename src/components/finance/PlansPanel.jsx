import { Check, Zap, Bell, Megaphone, Crown, TrendingUp, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ADDONS = [
  { id: "push5", name: "เพิ่มโควตา Push Notification", desc: "+5 ครั้ง/เดือน", price: 99, icon: Bell },
  { id: "banner3", name: "แบนเนอร์หน้าแรก (3 วัน)", desc: "Premium Slot", price: 199, icon: Megaphone },
  { id: "doublexp", name: "Double XP 3 วัน", desc: "กระตุ้นภารกิจชั่วคราว", price: 149, icon: Zap },
];

const TIER_LABEL = { starter: "Starter", growth: "Growth", premium: "Premium" };

import { DEFAULT_PLANS, TIER_LABELS } from "@/lib/plansConfig";

// Plans & benefits tab: Free vs Pro Booster comparison + upgrade (Stripe checkout
// via the page-level dialog) and plan management through the Stripe Portal.
export default function PlansPanel({ merchant, plans: dbPlans, loading, billing, onUpgrade, onOpenPortal, portalLoading }) {
  const { toast } = useToast();
  const buyAddon = (a) => {
    toast({ title: `ซื้อ ${a.name} แล้ว`, description: `ชำระ ฿${a.price} สำเร็จ · สิทธิ์เปิดใช้งาน Real-time` });
  };

  const isPro = Boolean(merchant?.is_pro || merchant?.tier === "pro" || merchant?.tier === "growth" || merchant?.tier === "premium");
  const currentTier = isPro ? "pro" : "starter";

  // Use database plans if available and matching 2 tiers, otherwise merge with DEFAULT_PLANS
  const displayPlans = DEFAULT_PLANS.map((def) => {
    const fromDb = (dbPlans || []).find((p) => p.code === def.code);
    return fromDb ? { ...def, ...fromDb, price: def.code === "pro" ? 259 : 0 } : def;
  });

  return (
    <div>
      <div className="mb-6 rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${isPro ? "bg-gradient-to-br from-amber-500 to-orange-500" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
              {isPro ? <Crown className="h-7 w-7" /> : <TrendingUp className="h-7 w-7" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">แพ็กเกจปัจจุบัน</p>
              <p className="text-2xl font-bold">
                {isPro ? "Pro Booster (โปรบูสเตอร์) · ฿259/เดือน" : "Starter (เริ่มต้นฟรี) · ฿0/เดือน"}
              </p>
              <p className="text-xs text-muted-foreground">{merchant ? `ร้าน: ${merchant.name} (คอมมิชชั่น ${isPro ? "3%" : "6%"})` : "ยังไม่ได้ผูกกับร้านค้า"}</p>
            </div>
          </div>
          {billing?.has_customer ? (
            <button
              onClick={onOpenPortal}
              disabled={portalLoading || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-muted px-5 py-2.5 text-sm font-semibold transition hover:bg-accent disabled:opacity-60"
            >
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              จัดการผ่าน Stripe Portal
            </button>
          ) : (
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              {isPro
                ? "คุณกำลังใช้งานสิทธิ์ Pro Booster รับส่วนลดค่าคอมมิชชัน 3% และมอบ 70 XP ให้ลูกค้า"
                : "อัปเกรดเป็น Pro Booster เพียง ฿259/เดือน เพื่อลดค่าคอมมิชชันเหลือ 3% และมอบ 70 XP"}
            </p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-bold text-lg">เลือกแพ็กเกจสำหรับร้านค้า</h3>
        <p className="text-xs text-muted-foreground">ไม่มีสัญญาผูกมัด สามารถยกเลิกหรือปรับเปลี่ยนได้ตลอดเวลา</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {displayPlans.map((p) => {
            const isCurrent = p.code === currentTier;
            const isHighlight = p.code === "pro";
            return (
              <div
                key={p.code}
                className={`relative flex flex-col justify-between rounded-3xl border bg-card p-6 transition-all ${
                  isHighlight ? "border-amber-400/80 shadow-lg ring-2 ring-amber-400/20" : "shadow-sm"
                }`}
                style={{ borderTop: `5px solid ${p.color}` }}
              >
                <div>
                  {isHighlight && (
                    <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-black text-white shadow">
                      ⭐ แนะนำสุดคุ้ม
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black" style={{ color: p.color }}>
                      {p.name}
                    </h3>
                    {isHighlight && <Crown className="h-5 w-5 text-amber-500" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                  
                  <div className="my-4">
                    <span className="text-3xl font-extrabold text-foreground">
                      ฿{p.price.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground ml-1.5">
                      {p.price > 0 ? "/เดือน (รวมภาษีแล้ว)" : " (ฟรีตลอดชีพ)"}
                    </span>
                  </div>

                  <div className="space-y-2 border-t pt-4 text-xs sm:text-sm">
                    {p.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        <span className="leading-tight text-foreground/90">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-2">
                  <button
                    onClick={() => onUpgrade(p)}
                    disabled={isCurrent}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition shadow-sm ${
                      isCurrent
                        ? "border bg-muted text-muted-foreground cursor-not-allowed"
                        : isHighlight
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-95 shadow-md active:scale-95"
                          : "bg-foreground text-background hover:opacity-90 active:scale-95"
                    }`}
                  >
                    {isCurrent ? "✓ แพ็กเกจปัจจุบันของคุณ" : isHighlight ? "⚡ อัปเกรดเป็น Pro Booster (฿259/เดือน)" : "เลือกแพ็กเกจนี้"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="mb-3 mt-8 font-semibold">Add-on เสริม</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {ADDONS.map((a) => (
          <div key={a.id} className="rounded-2xl border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <a.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 font-semibold">{a.name}</p>
            <p className="text-xs text-muted-foreground">{a.desc}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold">฿{a.price}</span>
              <button
                onClick={() => buyAddon(a)}
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
              >
                ซื้อ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}