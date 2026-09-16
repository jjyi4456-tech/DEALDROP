import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, Ticket, TrendingUp, Loader2 } from "lucide-react";

// Early CRM summary shown on the merchant profile: unique customers served,
// coupons redeemed, and an estimated off-peak revenue lift from quest traffic.
export default function InsightSummaryCard({ merchantId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantId) { setLoading(false); return; }
    (async () => {
      try {
        const [checkins, coupons] = await Promise.all([
          base44.entities.CheckIn.filter({ merchant_id: merchantId }, "-created_date", 200),
          base44.entities.Coupon.filter({ merchant_id: merchantId }, "-created_date", 200),
        ]);
        const usedCoupons = coupons.filter((c) => c.status === "used");
        const uniqueCustomers = new Set(checkins.map((c) => c.user_id).filter(Boolean)).size;
        const offPeakRevenue = usedCoupons.length * 45; // estimated value drawn from off-peak quests
        setStats({
          customers: uniqueCustomers || checkins.length,
          couponsUsed: usedCoupons.length,
          offPeakRevenue,
        });
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  return (
    <div className="mt-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold">สรุป Insights เบื้องต้น</h3>
      </div>
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-muted/30 p-3">
            <Users className="mx-auto mb-1 h-5 w-5 text-foreground" />
            <p className="text-xl font-bold">{stats?.customers ?? 0}</p>
            <p className="text-xs text-muted-foreground">ผู้เข้าใช้บริการ</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-3">
            <Ticket className="mx-auto mb-1 h-5 w-5 text-amber-500" />
            <p className="text-xl font-bold">{stats?.couponsUsed ?? 0}</p>
            <p className="text-xs text-muted-foreground">คูปองที่ใช้ไป</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <TrendingUp className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
            <p className="text-xl font-bold text-emerald-600">฿{(stats?.offPeakRevenue ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">รายได้ Off-peak</p>
          </div>
        </div>
      )}
      <Link to="/merchant/insight" className="mt-3 block text-center text-xs font-medium text-primary hover:underline">ดู CRM & Insight แบบเต็ม</Link>
    </div>
  );
}