import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Clock, Zap, Wallet, FlaskConical } from "lucide-react";
import { Image } from "@/components/ui/image";
import StatusCard from "@/components/user/StatusCard";
import RankShortcutCard from "@/components/user/RankShortcutCard";
import HotpotWidget from "@/components/user/HotpotWidget";
import { isQuestLiveNow } from "@/lib/questTime";
import { genSquadCode } from "@/lib/squadCode";
import PullToRefresh from "@/components/user/PullToRefresh";
import MysteryDropFab from "@/components/user/MysteryDropFab";
import MysteryBoxModal from "@/components/user/MysteryBoxModal";
import FlashQuestCard from "@/components/user/FlashQuestCard";
import QuestCountdownBadge from "@/components/user/QuestCountdownBadge";
import { useToast } from "@/components/ui/use-toast";

const catEmoji = { cafe: "☕", restaurant: "🍜", beverage: "🧋", dessert: "🍰", bakery: "🥐" };
const STOCK_IMG = {
  cafe: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80&fit=crop",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&fit=crop",
  beverage: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80&fit=crop",
  dessert: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80&fit=crop",
  bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&fit=crop",
};
const catGrad = {
  cafe: "from-amber-100 to-orange-100",
  restaurant: "from-orange-100 to-rose-100",
  beverage: "from-rose-100 to-pink-100",
  dessert: "from-pink-100 to-amber-100",
  bakery: "from-amber-100 to-yellow-100",
};
const catOf = (name = "") =>
  name.includes("คาเฟ่") || name.includes("กาแฟ") ? "cafe"
  : name.includes("ก๋วยเตี๋ยว") || name.includes("อาหาร") ? "restaurant"
  : name.includes("ชา") || name.includes("เครื่องดื่ม") ? "beverage"
  : name.includes("ขนม") || name.includes("เค้ก") ? "dessert" : "restaurant";

const FILTERS = ["ทั้งหมด", "☕ คาเฟ่", "🍜 อาหาร", "🧋 เครื่องดื่ม", "🍰 ขนม"];
const filterKey = (f) => ({ "☕ คาเฟ่": "cafe", "🍜 อาหาร": "restaurant", "🧋 เครื่องดื่ม": "beverage", "🍰 ขนม": "dessert" })[f];

export default function UserDiscovery() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ทั้งหมด");
  const [merchantMap, setMerchantMap] = useState({});
  const [nowTick, setNowTick] = useState(0);
  const [bounceQueue, setBounceQueue] = useState([]);
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    base44.auth.me().then(setMe).catch(() => {});
    const [q, merchants, bounce] = await Promise.all([
      base44.entities.Quest.filter({ status: "active" }, "-quest_date", 30),
      base44.entities.Merchant.list(),
      // 🎁 unopened bounce-back gift boxes waiting to surprise the customer
      base44.entities.Coupon.filter({ coupon_type: "bounce_back", box_opened: false, status: "available" }, "-created_date", 5).catch(() => []),
    ]);
    const map = {};
    merchants.forEach((m) => { map[m.id] = m; });
    setMerchantMap(map);
    setQuests(q);
    setBounceQueue(bounce || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    const unsub = base44.entities.Quest.subscribe((event) => {
      setQuests((prev) => {
        if (event.type === "create" && !prev.some((q) => q.id === event.data?.id)) return [event.data, ...prev];
        return prev.map((q) => (q.id === event.data?.id ? { ...q, ...event.data } : q));
      });
    });
    return unsub;
  }, []);

  // Re-evaluate the live-time window every 30s so quests open/close at their scheduled time
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const dist = (i) => ((i * 137 + 80) % 900).toFixed(0);
  void nowTick; // re-render trigger for the time-window filter
  const catFiltered = filter === "ทั้งหมด" ? quests : quests.filter((q) => catOf(q.merchant_name) === filterKey(filter));
  // Flash quests sit above everything, driven by their own 60-min countdown
  const flashQuests = quests.filter(
    (q) => q.is_flash && q.status === "active" && q.expires_at && new Date(q.expires_at).getTime() > Date.now()
  );
  // Show only quests currently inside their scheduled Bangkok date/time window
  const shown = catFiltered.filter((q) => !q.is_flash && isQuestLiveNow(q));
  const rewardLabel = (q) => q.reward_type === "percent" ? `ลด ${q.reward_value}` : q.reward_type === "cash" ? `ลด ${q.reward_value}฿` : `แถม ${q.reward_value}`;

  const startSquad = async (q) => {
    try {
      const meUser = await base44.auth.me();
      if (!meUser) return;
      const existing = await base44.entities.Squad.filter({ quest_id: q.id, leader_id: meUser.id, status: "recruiting" });
      let code = existing[0]?.squad_code;
      if (!code) {
        code = genSquadCode();
        await base44.entities.Squad.create({
          quest_id: q.id, merchant_id: q.merchant_id, merchant_name: q.merchant_name,
          leader_id: meUser.id, leader_name: meUser.full_name || meUser.email || "คุณ",
          squad_code: code, required_count: q.squad_size,
          members: [meUser.id], member_names: [meUser.full_name || meUser.email || "คุณ"],
          status: "recruiting",
          reward_title: q.title, reward_type: q.reward_type, reward_value: q.reward_value,
        });
      }
      navigate(`/user/squad/${code}`);
    } catch (e) {
      toast({ title: "สร้าง Squad ไม่สำเร็จ ลองอีกครั้ง", variant: "destructive" });
    }
  };

  return (
    <PullToRefresh onRefresh={load}>
    <div>
      <div className="mb-4 pt-1">
        <h2 className="text-xl font-bold leading-snug">
          สวัสดี{(me?.full_name || me?.email || "").trim() ? `คุณ${(me?.full_name || me?.email).trim().split(/\s+/)[0]}` : ""}! วันนี้หิวอะไรดี? 🦊
        </h2>
      </div>
      <HotpotWidget />
      <StatusCard />
      <RankShortcutCard />
      <MysteryDropFab />

      {bounceQueue.length > 0 && (
        <MysteryBoxModal
          coupon={bounceQueue[0]}
          onStow={async () => {
            await base44.entities.Coupon.update(bounceQueue[0].id, { box_opened: true }).catch(() => {});
            setBounceQueue((q) => q.slice(1));
          }}
        />
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === f ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-accent"}`}>{f}</button>
        ))}
      </div>

      {flashQuests.length > 0 && (
        <div className="mb-4 space-y-3">
          {flashQuests.map((q) => (
            <FlashQuestCard key={q.id} quest={q} />
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground">กำลังเปิดอยู่ · {shown.length}</h2>
        <div className="flex gap-2">
          <Link to="/user/bag" className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10">
            <FlaskConical className="h-3.5 w-3.5" /> คลังวัตถุดิบ
          </Link>
          <Link to="/user/bag" className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
            <Wallet className="h-3.5 w-3.5" /> คูปอง
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : (
        <div className="space-y-3">
          {shown.map((q, i) => {
            const cat = catOf(q.merchant_name);
            const left = q.capacity - (q.participants || 0);
            const urgent = left <= 2;
            const m = merchantMap[q.merchant_id];
            const cover = m?.cover_url || m?.logo_url || STOCK_IMG[cat];
            return (
              <div
                key={q.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/user/checkin?quest=${q.id}`)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/user/checkin?quest=${q.id}`); } }}
                className="block cursor-pointer overflow-hidden rounded-2xl border bg-card transition hover:shadow-md"
              >
                <div className="relative h-32 overflow-hidden">
                  {cover ? (
                    <Image src={cover} alt={q.merchant_name} fittingType="fill" className="h-32 w-full" />
                  ) : (
                    <div className={`flex h-32 w-full items-center justify-center bg-gradient-to-br ${catGrad[cat]}`}>
                      <span className="text-6xl drop-shadow-sm">{catEmoji[cat]}</span>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow">{rewardLabel(q)}</span>
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-foreground"><MapPin className="h-3 w-3" />{dist(i)}ม.</span>
                  {urgent && <span className="absolute bottom-3 right-3 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white animate-pulse">🔥 เหลือ {left}</span>}
                </div>
                <div className="p-4">
                  <h3 className="font-bold leading-tight">{q.title}</h3>
                  <Link to={`/user/merchant/${q.merchant_id}`} onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground transition hover:text-primary hover:underline">{q.merchant_name} · ดูเจ้าถิ่น</Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600"><Zap className="h-3 w-3" />+{q.xp_reward} XP</span>
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600"><Clock className="h-3 w-3" />{q.start_time}-{q.end_time}</span>
                    <QuestCountdownBadge endTime={q.end_time} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div className={`h-1.5 rounded-full ${urgent ? "bg-red-500" : "bg-primary"}`} style={{ width: `${((q.participants || 0) / q.capacity) * 100}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${urgent ? "text-red-500" : "text-muted-foreground"}`}>{left}/{q.capacity} สิทธิ์</span>
                  </div>
                  {q.squad_size >= 2 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startSquad(q); }}
                      className="mt-3 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                    >
                      🎉 ชวนเพื่อนตั้งตี้ ({q.squad_size} คน) → รับรางวัลใหญ่ + XP x3
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {shown.length === 0 && <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">ยังไม่มีภารกิจที่เปิดให้เช็คอินในขณะนี้</div>}
          </div>
          )}
          </div>
    </PullToRefresh>
  );
}