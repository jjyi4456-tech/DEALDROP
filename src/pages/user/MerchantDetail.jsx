import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { MapPin, Clock, Loader2 } from "lucide-react";
import MayorCard from "@/components/user/MayorCard";

const catEmoji = { cafe: "☕", restaurant: "🍜", beverage: "🧋", dessert: "🍰", bakery: "🥐" };
const catLabel = { cafe: "คาเฟ่", restaurant: "อาหาร", beverage: "เครื่องดื่ม", dessert: "ของหวาน", bakery: "เบเกอรี่" };
const STOCK_IMG = {
  cafe: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80&fit=crop",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&fit=crop",
  beverage: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80&fit=crop",
  dessert: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80&fit=crop",
  bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&fit=crop",
};

// User-facing merchant profile page — surfaces the "เจ้าถิ่นประจำร้าน" (Cafe Mayor)
// for this merchant this month.
export default function MerchantDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    base44.entities.Merchant.get(id)
      .then(setM)
      .catch(() => setM(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!m) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
        ไม่พบร้านค้านี้
      </div>
    );
  }

  const cat = m.category || "restaurant";
  const cover = m.cover_url || m.logo_url || STOCK_IMG[cat] || STOCK_IMG.restaurant;

  return (
    <div className="space-y-4">
      {/* Cover */}
      <div className="relative -mx-4 h-40 overflow-hidden">
        <Image src={cover} alt={m.name} fittingType="fill" className="h-40 w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
          {m.logo_url ? (
            <Image src={m.logo_url} alt="" fittingType="fill" className="h-14 w-14 rounded-2xl border-2 border-background object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl text-primary-foreground">
              {catEmoji[cat] || "🍴"}
            </div>
          )}
          <div className="flex-1 text-white">
            <h2 className="text-xl font-bold leading-tight drop-shadow">{m.name}</h2>
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-medium">{catLabel[cat] || cat}</span>
          </div>
        </div>
      </div>

      {/* Cafe Mayor mini-card — placed right under the cover & shop name */}
      <MayorCard merchantId={m.id} merchantName={m.name} />

      {/* Info */}
      <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
        {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{m.open_time || "—"} - {m.close_time || "—"}</span>
          {m.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{m.address}</span>}
        </div>
      </div>

      <Link to="/user" className="block w-full rounded-2xl bg-foreground py-3 text-center text-sm font-bold text-background">
        ดูภารกิจทั้งหมด
      </Link>
    </div>
  );
}