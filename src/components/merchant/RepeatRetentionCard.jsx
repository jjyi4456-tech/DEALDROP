import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Repeat } from "lucide-react";

// 🔄 Repeat-retention proof card for the merchant dashboard: how many
// bounce-back coupons were handed out, how many came back and got redeemed,
// and the distinct customers who returned within the last 7 days.
export default function RepeatRetentionCard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return;
      const mine = await base44.entities.Merchant.filter({ created_by_id: user.id }, "-created_date", 1).catch(() => []);
      const m = mine?.[0];
      if (!m) return;
      const coupons = await base44.entities.Coupon.filter(
        { coupon_type: "bounce_back", merchant_id: m.id }, "-created_date", 200
      ).catch(() => []);
      const list = coupons || [];
      const issued = list.length;
      const used = list.filter((c) => c.status === "used");
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const repeatIds = new Set(
        used
          .filter((c) => new Date(c.redeemed_date || c.updated_date).getTime() >= weekAgo)
          .map((c) => c.user_id)
      );
      const rate = issued > 0 ? Math.round((used.length / issued) * 100) : 0;
      setStats({ repeat: repeatIds.size, used: used.length, issued, rate });
    })();
  }, []);

  if (stats === null) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-5 text-white shadow-lg">
      <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
        <Repeat className="h-4 w-4" /> Repeat Retention · ลูกค้ากลับมาซ้ำ
      </div>
      <p className="mt-2 text-xl font-bold leading-snug">
        🔄 ลูกค้าที่กลับมาทานซ้ำในสัปดาห์นี้: {stats.repeat} คน
      </p>
      <p className="mt-1 text-sm opacity-90">
        อัตราความสำเร็จคูปองของขวัญ {stats.rate}% (ใช้แล้ว {stats.used} ใบ จากที่แจกไป {stats.issued} ใบ)
      </p>
      <p className="mt-1 text-xs opacity-75">
        แอปไม่ได้พาคนมากินครั้งเดียวแล้วหาย — สร้างลูกค้าประจำให้ร้านของคุณได้จริง
      </p>
    </div>
  );
}