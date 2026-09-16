import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Share2, Moon, Sun, Crown, Store, Wallet, Award } from "lucide-react";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const titleOf = (xp) =>
  xp >= 5000 ? "เทพอาหาร" :
  xp >= 2000 ? "นักล่าระดับเซียน" :
  xp >= 500 ? "นักล่ามือฉมัง" :
  xp >= 100 ? "นักล่ามือใหม่" : "นักชิมมือใหม่";
const levelOf = (xp) => Math.min(99, Math.floor((xp || 0) / 500) + 1);

const TH_BBOX = { lngMin: 97.3, lngMax: 105.7, latMin: 5.6, latMax: 20.5 };
const VW = { xMin: 78, xMax: 232, yMin: 0, yMax: 328 };
const project = (lat, lng) => ({
  x: VW.xMin + ((lng - TH_BBOX.lngMin) / (TH_BBOX.lngMax - TH_BBOX.lngMin)) * (VW.xMax - VW.xMin),
  y: VW.yMin + ((TH_BBOX.latMax - lat) / (TH_BBOX.latMax - TH_BBOX.latMin)) * (VW.yMax - VW.yMin),
});
const hashLL = (id = "") => {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const lat = TH_BBOX.latMin + (h % 1000) / 1000 * (TH_BBOX.latMax - TH_BBOX.latMin);
  const lng = TH_BBOX.lngMin + ((h >> 10) % 1000) / 1000 * (TH_BBOX.lngMax - TH_BBOX.lngMin);
  return project(lat, lng);
};
const THAILAND_PATH =
  "M118 6 L104 16 L94 30 L82 42 L92 58 L86 74 L96 90 L100 102 L96 118 L92 142 L96 168 L100 198 L104 228 L108 258 L112 290 L114 320 L118 292 L122 264 L126 234 L130 204 L134 174 L136 146 L140 122 L144 110 L160 106 L182 100 L204 90 L220 74 L228 60 L218 48 L204 40 L188 32 L170 24 L150 16 L132 9 Z";

const dotColor = (count) =>
  count >= 5 ? "#ea580c" : count >= 3 ? "#f97316" : count === 2 ? "#fb923c" : "#fdba74";

export default function ConquestMap() {
  const { toast } = useToast();
  const cardRef = useRef(null);
  const [me, setMe] = useState(null);
  const [points, setPoints] = useState([]);
  const [stats, setStats] = useState({ shops: 0, savings: 0, cafeCount: 0 });
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("light");
  const [sharing, setSharing] = useState(false);
  const [qrOk, setQrOk] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setMe(user);
        const [checkins, merchants, coupons] = await Promise.all([
          base44.entities.CheckIn.filter({ user_id: user.id }, "-created_date", 500),
          base44.entities.Merchant.list(),
          base44.entities.Coupon.filter({ user_id: user.id }, "-created_date", 200),
        ]);
        const mercMap = {};
        merchants.forEach((m) => { mercMap[m.id] = m; });
        const groups = {};
        checkins.forEach((c) => {
          const key = c.merchant_id || c.merchant_name || "x";
          if (!groups[key]) groups[key] = { id: key, name: c.merchant_name, count: 0, category: mercMap[c.merchant_id]?.category };
          groups[key].count += 1;
        });
        const pts = Object.values(groups).map((g) => ({ ...g, ...hashLL(g.id) }));
        setPoints(pts);
        const cafeCount = Object.values(groups).filter((g) => g.category === "cafe").length;
        const savings = coupons.reduce((s, c) => c.reward_type === "cash" ? s + (parseFloat(c.reward_value) || 0) : s, 0);
        setStats({ shops: pts.length, savings, cafeCount });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const golden = stats.cafeCount >= 10;
  const cafeProgress = useMemo(() => Math.min(stats.cafeCount, 10), [stats.cafeCount]);

  const theme = mode === "light"
    ? { bg: "#eef2f7", mapFill: "#e2e8f0", mapStroke: "#cbd5e1", card: "rgba(255,255,255,0.92)" }
    : { bg: "#0f172a", mapFill: "#1e293b", mapStroke: "#334155", card: "rgba(15,23,42,0.86)" };

  const onShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, { useCORS: true, backgroundColor: null, scale: 2, logging: false });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "dealdrop-conquest.png";
      a.click();
      toast({ title: "จับภาพอาณาเขตของคุณแล้ว 🎉", description: "บันทึกลงเครื่องแล้ว พร้อมแชร์ลง IG / TikTok" });
    } catch (e) {
      toast({ title: "จับภาพไม่สำเร็จ", description: "ลองอีกครั้ง", variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="pb-28">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">แผนที่อาณาเขต</h1>
          <p className="text-xs text-muted-foreground">ทุกจุดคือร้าน F&B ที่คุณบุกเบิกแล้ว</p>
        </div>
        <button onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-accent">
          {mode === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          {mode === "light" ? "โทนเข้ม" : "โทนสว่าง"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
      ) : points.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">ยังไม่ได้บุกเบิกร้านไหน</p>
          <p className="mt-1 text-sm text-muted-foreground">ไปทำภารกิจเช็คอินที่ร้าน F&B ก่อนนะ</p>
        </div>
      ) : (
        <>
          {/* Shareable card */}
          <div ref={cardRef} className="relative overflow-hidden rounded-3xl border" style={{ background: theme.bg, height: 470 }}>
            {/* Thailand map graphic */}
            <svg viewBox="78 0 154 328" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
              <path d={THAILAND_PATH} fill={theme.mapFill} stroke={theme.mapStroke} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p) => {
                const r = 4 + Math.min(p.count, 5) * 2.2;
                const color = golden ? "#fbbf24" : dotColor(p.count);
                return (
                  <g key={p.id}>
                    <circle cx={p.x} cy={p.y} r={r * 1.9} fill={color} opacity={golden ? 0.34 : 0.2} />
                    <circle cx={p.x} cy={p.y} r={r} fill={color} stroke="#ffffff" strokeWidth={1.4} />
                  </g>
                );
              })}
            </svg>

            {/* golden unlock badge */}
            {golden && (
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-900 shadow">
                <Crown className="h-3.5 w-3.5" /> สกินทอง ปลดล็อกแล้ว
              </div>
            )}

            {/* stats overlay */}
            <div className="absolute bottom-3 left-3 right-20 rounded-2xl p-3 backdrop-blur" style={{ background: theme.card }}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-primary"><Store className="h-3.5 w-3.5" /></div>
                  <p className="text-lg font-bold" style={{ color: mode === "light" ? "#0f172a" : "#fff" }}>{stats.shops}</p>
                  <p className="text-xs" style={{ color: mode === "light" ? "#64748b" : "#94a3b8" }}>ร้านที่บุกเบิก</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-primary"><Wallet className="h-3.5 w-3.5" /></div>
                  <p className="text-lg font-bold" style={{ color: mode === "light" ? "#0f172a" : "#fff" }}>฿{stats.savings.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: mode === "light" ? "#64748b" : "#94a3b8" }}>ประหยัดไปแล้ว</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-primary"><Award className="h-3.5 w-3.5" /></div>
                  <p className="text-sm font-bold leading-tight" style={{ color: mode === "light" ? "#0f172a" : "#fff" }}>{me ? titleOf(me.xp) : "—"}</p>
                  <p className="text-xs" style={{ color: mode === "light" ? "#64748b" : "#94a3b8" }}>Lv. {me ? levelOf(me.xp) : 1}</p>
                </div>
              </div>
            </div>

            {/* watermark + QR */}
            <div className="absolute bottom-3 right-3 flex flex-col items-center rounded-2xl p-1.5 backdrop-blur" style={{ background: theme.card }}>
              <p className="mb-1 text-xs font-extrabold text-primary">DEALDROP</p>
              {qrOk ? (
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&margin=0&color=ff7a00&bgcolor=ffffff&data=${encodeURIComponent(window.location.origin)}`}
                  width={48} height={48} alt="QR" className="rounded-md bg-white p-0.5" onError={() => setQrOk(false)} />
              ) : (
                <div className="grid h-12 w-12 grid-cols-5 grid-rows-5 gap-px overflow-hidden rounded bg-white p-0.5">
                  {Array.from({ length: 25 }).map((_, i) => <div key={i} className={(i % 3 === 0 || i % 5 === 0) ? "bg-primary" : "bg-transparent"} />)}
                </div>
              )}
              <p className="mt-0.5 text-xs" style={{ color: mode === "light" ? "#64748b" : "#94a3b8" }}>สแกนโหลดแอป</p>
            </div>
          </div>

          {/* milestone progress */}
          <div className="mt-3 rounded-2xl border bg-card p-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium"><Crown className="h-3.5 w-3.5 text-amber-500" /> สกินทอง (เช็คอินคาเฟ่ 10 ร้าน)</span>
              <span className="font-bold text-primary">{cafeProgress}/10</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-2 rounded-full bg-gradient-to-r from-primary to-amber-400" style={{ width: `${(cafeProgress / 10) * 100}%` }} />
            </div>
          </div>

          {/* share button */}
          <button onClick={onShare} disabled={sharing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg active:scale-95 transition disabled:opacity-60">
            <Share2 className="h-5 w-5" /> {sharing ? "กำลังจับภาพ..." : "อวดอาณาเขตของคุณ"}
          </button>
        </>
      )}
    </div>
  );
}