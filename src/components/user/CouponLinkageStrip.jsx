import { Ticket, X } from "lucide-react";

// Auto-Coupon Linkage: shows the customer's usable coupons for this shop and
// lets them attach one to the order in a single tap. `onSelect(null)` detaches.
export default function CouponLinkageStrip({ coupons, selectedId, onSelect }) {
  if (!coupons || coupons.length === 0) return null;
  const selected = coupons.find((c) => c.id === selectedId) || null;

  if (selected) {
    return (
      <button
        onClick={() => onSelect(null)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Ticket className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-xs font-bold text-primary">
            🎟️ ใช้คูปอง {selected.title} ลดทันที{" "}
            {selected.reward_type === "percent" ? `${selected.reward_value}%` : `฿${selected.reward_value}`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary">
          ยกเลิก <X className="h-3.5 w-3.5" />
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-muted-foreground">🎟️ คูปองของคุณใช้ได้กับร้านนี้ — กดใช้เลย ลดทันที!</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {coupons.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="whitespace-nowrap rounded-xl border border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition active:scale-95"
          >
            {c.title} · ลด {c.reward_type === "percent" ? `${c.reward_value}%` : `฿${c.reward_value}`}
          </button>
        ))}
      </div>
    </div>
  );
}