import { useState } from "react";
import { Flame, Clock, Sparkles, MapPin, ArrowRight } from "lucide-react";
import useCountdown, { fmtMMSS } from "@/hooks/useCountdown";
import RescueClaimModal from "@/components/user/RescueClaimModal";

export default function RescueDealCard({ deal, onClaimSuccess }) {
  const [claimOpen, setClaimOpen] = useState(false);
  const msLeft = useCountdown(deal.pickup_deadline);

  if (!deal || deal.status !== "active" || (deal.remaining_qty ?? 0) <= 0) {
    return null;
  }

  // If time completely passed, don't show
  if (deal.pickup_deadline && msLeft <= 0) return null;

  const left = deal.remaining_qty ?? 1;
  const total = deal.initial_qty ?? 1;
  const origP = deal.original_price ?? 0;
  const dealP = deal.deal_price ?? 0;
  const discountPct = origP > 0 ? Math.round(((origP - dealP) / origP) * 100) : 0;
  const urgent = left <= 2;

  const deadlineFormatted = deal.pickup_deadline
    ? new Date(deal.pickup_deadline).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <>
      <div className="group relative overflow-hidden rounded-3xl border-2 border-red-400/80 bg-gradient-to-br from-red-50/90 via-orange-50/50 to-amber-50/70 p-4 dark:from-red-950/40 dark:to-orange-950/30 shadow-md transition-all hover:shadow-lg">
        {/* Pulsing glow line */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-red-400/15 blur-2xl group-hover:bg-red-500/25 transition-all" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm animate-pulse">
                <Flame className="h-3 w-3" /> RESCUE DEAL
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 border border-emerald-300/60">
                <Sparkles className="h-3 w-3 text-emerald-600" /> Eco-XP x2 (+100)
              </span>
            </div>

            <h3 className="text-base font-black text-foreground line-clamp-1">{deal.item_name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">🏪 {deal.merchant_name}</p>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-600">฿{dealP}</span>
              <span className="text-xs text-muted-foreground line-through font-medium">฿{origP}</span>
              {discountPct > 0 && (
                <span className="rounded-lg bg-red-500/10 px-2 py-0.5 text-xs font-black text-red-600">
                  ลด {discountPct}%
                </span>
              )}
            </div>
          </div>

          {deal.item_image && (
            <div className="relative shrink-0">
              <img
                src={deal.item_image}
                alt={deal.item_name}
                className="h-20 w-20 rounded-2xl object-cover border border-white/60 shadow-sm"
              />
              <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                เหลือ {left}
              </span>
            </div>
          )}
        </div>

        {/* Progress & Countdown */}
        <div className="mt-3.5 space-y-2 pt-2.5 border-t border-red-200/50 dark:border-red-900/40">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
              <Clock className="h-3.5 w-3.5" />
              เหลือเวลารับ {fmtMMSS(msLeft)} (ก่อน {deadlineFormatted} น.)
            </span>
            <span className={`font-extrabold ${urgent ? "text-red-600 animate-bounce" : "text-muted-foreground"}`}>
              {urgent ? `🔥 เหลือแค่ ${left} ชิ้น!` : `เหลือ ${left}/${total} ชิ้น`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setClaimOpen(true)}
            className="w-full rounded-2xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md transition hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>กดจองเมนูกู้ชีพ (Rescue Now)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <RescueClaimModal
        deal={deal}
        open={claimOpen}
        onOpenChange={setClaimOpen}
        onClaimSuccess={onClaimSuccess}
      />
    </>
  );
}
