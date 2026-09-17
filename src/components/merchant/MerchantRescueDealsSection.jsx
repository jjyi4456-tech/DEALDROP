import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Flame, Clock, PackageCheck, AlertTriangle, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import useCountdown, { fmtMMSS } from "@/hooks/useCountdown";

function RescueCountdownTag({ deadline }) {
  const ms = useCountdown(deadline);
  if (!deadline || ms <= 0) {
    return <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-muted-foreground font-semibold">หมดเวลารับ</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-extrabold text-red-600 animate-pulse">
      <Clock className="h-3 w-3" /> เหลือเวลารับ {fmtMMSS(ms)}
    </span>
  );
}

export default function MerchantRescueDealsSection({ refreshTrigger }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const me = await base44.auth.me().catch(() => null);
      if (!me) return;
      const merchants = await base44.entities.Merchant.filter({ created_by_id: me.id }, "-created_date", 1);
      const m = merchants[0] || null;
      setMerchant(m);
      if (m) {
        const rows = await base44.entities.RescueDeal.filter({ merchant_id: m.id }, "-created_at", 10).catch(() => []);
        setDeals(rows);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const handleCloseEarly = async (id) => {
    try {
      await base44.entities.RescueDeal.update(id, { status: "expired" });
      toast({ title: "ปิดการรับดีลนี้แล้ว" });
      load();
    } catch (e) {
      toast({ title: "เกิดข้อผิดพลาด", description: e.message, variant: "destructive" });
    }
  };

  const activeDeals = deals.filter((d) => d.status === "active" && new Date(d.pickup_deadline).getTime() > Date.now());

  if (loading || activeDeals.length === 0) return null;

  return (
    <div className="mb-6 rounded-3xl border border-red-200/80 bg-gradient-to-br from-red-50/70 via-orange-50/40 to-amber-50/50 p-5 dark:from-red-950/20 dark:to-orange-950/20 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
            <Flame className="h-5 w-5 animate-pulse" />
          </span>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5 text-foreground">
              🚨 ดีลกู้ชีพที่กำลังเปิดรับ ({activeDeals.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              เมนูเคลียร์สต็อกที่ลูกค้ากำลังเห็นและกดจองอยู่ในขณะนี้
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {activeDeals.map((deal) => {
          const left = deal.remaining_qty ?? 0;
          const total = deal.initial_qty ?? 1;
          const sold = total - left;
          const progress = Math.min(100, Math.round((sold / total) * 100));

          return (
            <div key={deal.id} className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-extrabold text-sm line-clamp-1">{deal.item_name}</h4>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-base font-black text-red-600">฿{deal.deal_price}</span>
                      <span className="text-xs text-muted-foreground line-through">฿{deal.original_price}</span>
                    </div>
                  </div>
                  {deal.item_image && (
                    <img src={deal.item_image} alt="" className="h-12 w-12 rounded-xl object-cover border" />
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">รับไปแล้ว {sold}/{total} ชิ้น</span>
                    <span className="font-bold text-foreground">เหลือ {left} ชิ้น</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
                <RescueCountdownTag deadline={deal.pickup_deadline} />
                <button
                  type="button"
                  onClick={() => handleCloseEarly(deal.id)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-destructive transition"
                >
                  ปิดดีลนี้ก่อนเวลา
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
