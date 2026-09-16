import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import useCountdown, { fmtMMSS } from "@/hooks/useCountdown";

// Red countdown chip used on every flash surface
export function FlashCountdownBadge({ expiresAt }) {
  const msLeft = useCountdown(expiresAt);
  if (!expiresAt || msLeft <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow animate-pulse">
      <Zap className="h-3 w-3" /> FLASH DROP · เหลือเวลา {fmtMMSS(msLeft)} นาที
    </span>
  );
}

// Urgency-designed flash quest card. Auto-dissolves when the 60 minutes run out.
// onClaim lets hosts plug their own flow (e.g. landing soft-auth); default goes
// straight to the check-in mission.
export default function FlashQuestCard({ quest, onClaim }) {
  const navigate = useNavigate();
  const msLeft = useCountdown(quest?.expires_at);
  if (!quest || !quest.expires_at || msLeft <= 0) return null; // expired → vanish

  const left = Math.max(0, (quest.capacity || 0) - (quest.participants || 0));
  const claim = () => (onClaim ? onClaim(quest) : navigate(`/user/checkin?quest=${quest.id}`));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={claim}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); claim(); } }}
      className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 shadow-lg"
    >
      {/* pulsing orange glow border */}
      <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl border-2 border-orange-400" />
      <div className="relative p-4">
        <FlashCountdownBadge expiresAt={quest.expires_at} />
        <h3 className="mt-2.5 text-lg font-extrabold leading-tight">⚡ {quest.merchant_name}</h3>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-orange-600">
          ลด {quest.reward_value}%
          <span className="ml-2 align-middle text-sm font-bold text-orange-500">ที่โต๊ะทันที</span>
        </p>
        <p className={`mt-1.5 text-sm font-bold ${left <= 2 ? "text-red-500" : "text-foreground"}`}>
          {left <= 2 ? `🔥 เหลือ ${left} โต๊ะสุดท้าย!` : `🔥 เหลือ ${left}/${quest.capacity} โต๊ะ`}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); claim(); }}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 text-sm font-extrabold text-white shadow-md transition hover:opacity-90 active:scale-95"
        >
          คว้าสิทธิ์ด่วน (Claim Now)
        </button>
      </div>
    </div>
  );
}