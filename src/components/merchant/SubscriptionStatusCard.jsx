import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CreditCard, Crown, ChevronRight, Loader2 } from "lucide-react";

// Current subscription plan status with an upgrade shortcut.
import { TIER_LABELS, TIER_COLORS } from "@/lib/plansConfig";

export default function SubscriptionStatusCard({ tier }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const plans = await base44.entities.SubscriptionPlan.list("price", 10);
        setPlan(plans.find((p) => p.code === tier) || plans[0] || null);
      } catch {
        setPlan(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [tier]);

  if (loading) {
    return (
      <div className="mt-5 flex justify-center rounded-2xl border bg-card p-5">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const color = TIER_COLOR[tier] || "#10b981";
  return (
    <div className="mt-5 rounded-2xl border bg-card p-5 shadow-sm" style={{ borderTop: `4px solid ${color}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1a`, color }}>
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">แพ็กเกจปัจจุบัน</p>
            <p className="text-lg font-bold" style={{ color }}>
              {TIER_LABELS[tier] || tier}
              {(tier === "pro" || tier === "premium" || tier === "growth") && <Crown className="ml-1 inline h-4 w-4 text-amber-500" />}
            </p>
          </div>
        </div>
        {plan && (
          <p className="text-sm font-semibold">
            ฿{plan.price?.toLocaleString() || 0}
            <span className="text-xs font-normal text-muted-foreground">/เดือน</span>
          </p>
        )}
      </div>
      <Link to="/merchant/finance" className="mt-4 flex items-center justify-center gap-1 rounded-xl bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90">
        อัปเกรดแผนการใช้งาน <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}