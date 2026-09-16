import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Eye } from "lucide-react";

const VIEWS_PER_SHARE = 300;

// 📸 Weekly story-share stats for the merchant dashboard: counts bill redemptions
// flagged story_shared over the last 7 days and estimates organic reach.
export default function StoryBoostStatCard() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return;
      const mine = await base44.entities.Merchant.filter({ created_by_id: user.id }, "-created_date", 1).catch(() => []);
      const m = mine?.[0];
      if (!m) return;
      const ledger = await base44.entities.MerchantLedger.filter({ merchant_id: m.id }, "-created_date", 100).catch(() => []);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setCount((ledger || []).filter((l) => l.story_shared && new Date(l.created_date).getTime() >= weekAgo).length);
    })();
  }, []);

  if (count === null) return null;

  const reach = count * VIEWS_PER_SHARE;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-rose-500 p-5 text-white shadow-lg">
      <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
        <Camera className="h-4 w-4" /> IG & TikTok Story Multiplier
      </div>
      <p className="mt-2 text-xl font-bold leading-snug">
        📸 ยอดแชร์ Story จากลูกค้า: {count} ครั้งในสัปดาห์นี้
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm opacity-90">
        <Eye className="h-4 w-4" />
        ช่วยโปรโมตร้านสู่สายตาผู้คนราว ~{reach.toLocaleString("th-TH")} วิวฟรี!
      </p>
      {count === 0 && (
        <p className="mt-1 text-xs opacity-75">เปิดสิทธิ์ Story Boost ที่หน้าโปรไฟล์ร้านเพื่อให้ลูกค้าช่วยแชร์บอกต่อ</p>
      )}
    </div>
  );
}