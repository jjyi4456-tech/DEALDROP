import { Check, Zap, Bell, Megaphone, Crown, TrendingUp, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ADDONS = [
  { id: "push5", name: "เพิ่มโควตา Push Notification", desc: "+5 ครั้ง/เดือน", price: 99, icon: Bell },
  { id: "banner3", name: "แบนเนอร์หน้าแรก (3 วัน)", desc: "Premium Slot", price: 199, icon: Megaphone },
  { id: "doublexp", name: "Double XP 3 วัน", desc: "กระตุ้นภารกิจชั่วคราว", price: 149, icon: Zap },
];

const TIER_LABEL = { starter: "Starter", growth: "Growth", premium: "Premium" };

// Plans & benefits tab: Free vs Pro Booster comparison + upgrade (Stripe checkout
// via the page-level dialog) and plan management through the Stripe Portal.
export default function PlansPanel({ merchant, plans, loading, billing, onUpgrade, onOpenPortal, portalLoading }) {
  const { toast } = useToast();
  const buyAddon = (a) => {
    toast({ title: `ซื้อ ${a.name} แล้ว`, description: `ชำระ ฿${a.price} สำเร็จ · สิทธิ์เปิดใช้งาน Real-time` });
  };

  const currentTier = merchant?.tier || "starter";
  const currentPlan = plans.find((p) => p.code === currentTier);

  return (
    <div>
      <div className="mb-6 rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <TrendingUp className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">แพ็กเกจปัจจุบัน</p>
              <p className="text-2xl font-bold">
                {loading ? "—" : `${TIER_LABEL[currentTier] || currentTier} · ฿${currentPlan?.price?.toLocaleString() || 0}/เดือน`}
              </p>
              <p className="text-xs text-muted-foreground">{merchant ? `ร้าน: ${merchant.name}` : "ยังไม่ได้ผูกกับร้านค้า"}</p>
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
              สมัครแพ็กเกจรายเดือนด้านล่างด้วยบัตรเครดิต เพื่อจัดการสิทธิ์และใบเสร็จผ่าน Stripe Portal ได้
            </p>
          )}
        </div>
      </div>

      <h3 className="mb-3 font-semibold">อัปเกรดแพ็กเกจ</h3>
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.code === currentTier;
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border bg-card p-6 ${p.code === "premium" ? "border-amber-300 shadow-md" : ""}`}
                style={{ borderTop: `4px solid ${p.color}` }}
              >
                {p.code === "premium" && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                    แนะนำ
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold" style={{ color: p.color }}>
                    {p.name}
                  </h3>
                  {p.code === "premium" && <Crown className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="text-2xl font-bold">
                  ฿{p.price.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">/เดือน</span>
                </p>
                <div className="mt-4 space-y-1.5 text-sm">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> <span>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onUpgrade(p)}
                  disabled={isCurrent}
                  className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
                    isCurrent
                      ? "border bg-muted text-muted-foreground"
                      : p.code === "premium"
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {isCurrent ? "แพ็กเกจปัจจุบัน" : `อัปเกรดเป็น ${p.name}`}
                </button>
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