import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Clock } from "lucide-react";
import { isQuestLiveNow } from "@/lib/questTime";
import FlashQuestCard from "@/components/user/FlashQuestCard";

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "cafe", label: "☕ คาเฟ่ & ชานม" },
  { key: "food", label: "🍜 อาหารจานเดียว" },
  { key: "bbq", label: "🔥 ชาบู/ปิ้งย่าง" },
  { key: "dessert", label: "🍰 ของหวาน" },
];

const BBQ_RE = /ชาบู|ปิ่งย่าง|ปิ้งย่าง|หมูกระทะ|ย่าง|บุฟเฟต์|grill|bbq/i;
const CAKE_RE = /เค้ก|ขนม|เบเกอรี่|บิสกอต|ไอศกรีม|วุ้น/i;
const DRINK_RE = /คาเฟ่|กาแฟ|ชานม|ชา|เครื่องดื่ม|นมสด|coffee/i;

// Fallback category heuristic when the merchant record has no category set.
const catOf = (name = "") => {
  if (DRINK_RE.test(name)) return "cafe";
  if (CAKE_RE.test(name)) return "dessert";
  return "restaurant";
};

const STOCK_IMG = {
  cafe: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80&fit=crop",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&fit=crop",
  beverage: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80&fit=crop",
  dessert: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80&fit=crop",
  bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&fit=crop",
};

const matchFilter = (q, key, merchantMap) => {
  if (key === "all") return true;
  const cat = merchantMap[q.merchant_id]?.category || catOf(q.merchant_name || "");
  const hay = `${q.merchant_name || ""} ${q.title || ""}`;
  if (key === "cafe") return cat === "cafe" || cat === "beverage";
  if (key === "dessert") return cat === "dessert" || cat === "bakery";
  if (key === "bbq") return BBQ_RE.test(hay);
  if (key === "food") return cat === "restaurant" && !BBQ_RE.test(hay);
  return true;
};

const rewardBadge = (q) => {
  const v = String(q.reward_value ?? "").replace("%", "").trim();
  if (q.reward_type === "percent") return `ลด ${v}%`;
  if (q.reward_type === "cash") return `ลด ${v}฿`;
  return `แถม ${q.reward_value}`;
};

export default function LiveQuestShowcase({ onStartQuest, onStartSquad }) {
  const [quests, setQuests] = useState([]);
  const [merchantMap, setMerchantMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [q, merchants] = await Promise.all([
          base44.entities.Quest.filter({ status: "active" }, "-quest_date", 30),
          base44.entities.Merchant.list(),
        ]);
        if (!alive) return;
        const map = {};
        merchants.forEach((m) => {
          map[m.id] = m;
        });
        setMerchantMap(map);
        setQuests(q);
      } catch {
        if (alive) setUnavailable(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const shown = quests
    .filter((q) => matchFilter(q, filter, merchantMap))
    .filter((q) => !(q.is_flash && q.expires_at && new Date(q.expires_at).getTime() <= Date.now()))
    .sort((a, b) => (b.is_flash ? 1 : 0) - (a.is_flash ? 1 : 0));

  return (
    <section id="quests" className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-4">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">🎯 ภารกิจสดวันนี้</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          อัปเดตจากร้านค้าจริงรอบตัว — กดรับสิทธิ์ เช็คอินที่หน้าร้าน รับส่วนลดทันที
        </p>
      </div>

      {/* Category filter chips (horizontal scroll on mobile) */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === f.key ? "bg-primary text-primary-foreground shadow" : "border bg-card hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : unavailable ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดภารกิจได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          ยังไม่มีภารกิจในหมวดนี้ — ลองเลือก “ทั้งหมด” ดูร้านอื่น ๆ รอบตัว
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((q) => {
            if (q.is_flash) return <FlashQuestCard key={q.id} quest={q} onClaim={onStartQuest} />;
            const m = merchantMap[q.merchant_id];
            const cat = m?.category || catOf(q.merchant_name || "");
            const cover = m?.cover_url || m?.logo_url || STOCK_IMG[cat];
            const left = Math.max(0, (q.capacity || 0) - (q.participants || 0));
            const urgent = left <= 2;
            const hasTime = q.start_time && q.end_time;
            return (
              <div key={q.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
                <div className="relative h-32">
                  {cover ? (
                    <Image src={cover} alt={q.merchant_name} fittingType="fill" className="h-32 w-full" />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                      <span className="text-5xl">🍽️</span>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow">
                    {rewardBadge(q)}
                  </span>
                  {isQuestLiveNow(q) && (
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                      ● LIVE
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-bold leading-tight">{q.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">🏪 {q.merchant_name}</p>

                  {hasTime && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      ช่วง {q.start_time} - {q.end_time} น.
                    </div>
                  )}

                  {/* Remaining quota bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div
                        className={`h-1.5 rounded-full ${urgent ? "bg-red-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, ((q.participants || 0) / (q.capacity || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${urgent ? "text-red-500" : "text-muted-foreground"}`}>
                      เหลือ {left}/{q.capacity} โต๊ะ
                    </span>
                  </div>

                  {q.squad_size >= 2 && (
                    <span className="mt-2.5 inline-flex w-fit items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-600">
                      🎉 ภารกิจตี้ {q.squad_size} คน โบนัส XP x3
                    </span>
                  )}

                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      onClick={() => onStartQuest(q)}
                      className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-95"
                    >
                      ล่าภารกิจนี้
                    </button>
                    {q.squad_size >= 2 && (
                      <button
                        onClick={() => onStartSquad(q)}
                        className="w-full rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/10 active:scale-95"
                      >
                        ชวนเพื่อนตั้งตี้
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}