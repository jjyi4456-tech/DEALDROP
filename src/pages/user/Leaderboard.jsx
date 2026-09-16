import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Flame, ChevronUp, ChevronDown, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PERIODS = [
  { key: "all", label: "ตลอดกาล" },
  { key: "weekly", label: "รายสัปดาห์" },
  { key: "monthly", label: "รายเดือน" },
];

const PODIUM_ORDER = [2, 1, 3];
const avatarBg = (id = "") => {
  const colors = ["bg-rose-100 text-rose-600", "bg-amber-100 text-amber-600", "bg-emerald-100 text-emerald-600", "bg-violet-100 text-violet-600", "bg-sky-100 text-sky-600"];
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
};

export default function Leaderboard() {
  const [period, setPeriod] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flashIds, setFlashIds] = useState(new Set());
  const [dirs, setDirs] = useState({});
  const prevXp = useRef({});
  const prevRank = useRef({});
  const timer = useRef();

  const load = useCallback(async (p) => {
    try {
      const res = await base44.functions.invoke("getLeaderboard", { period: p });
      const d = res.data;
      const nf = new Set();
      const nd = {};
      d.top.forEach((u) => {
        if (prevXp.current[u.id] != null && u.xp > prevXp.current[u.id]) nf.add(u.id);
        if (prevRank.current[u.id] != null) {
          if (u.rank < prevRank.current[u.id]) nd[u.id] = "up";
          else if (u.rank > prevRank.current[u.id]) nd[u.id] = "down";
        }
        prevXp.current[u.id] = u.xp;
        prevRank.current[u.id] = u.rank;
      });
      setData(d);
      setFlashIds(nf);
      setDirs(nd);
      setTimeout(() => { setFlashIds(new Set()); setDirs({}); }, 2000);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    prevXp.current = {};
    prevRank.current = {};
    load(period);
    const debounced = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => load(period), 1200);
    };
    const unsub = base44.entities.CheckIn.subscribe(debounced);
    return unsub;
  }, [period, load]);

  const podium = (data?.top || []).slice(0, 3);
  const rest = (data?.top || []).slice(3);
  const me = data?.me;

  return (
    <div className="pb-28">
      {/* Period tabs */}
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`rounded-xl py-2 text-sm font-medium transition ${period === p.key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Flash XP banner (Off-peak Boost) */}
      {data?.flash?.active && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-orange-400 p-3 text-white shadow-md">
          <Flame className="h-5 w-5 animate-pulse" />
          <p className="text-sm font-semibold">{data.flash.message}</p>
        </motion.div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
      ) : (
        <>
          {/* Podium Top 3 */}
          {podium.length > 0 && (
            <div className="mb-2 flex items-end justify-center gap-2">
              {PODIUM_ORDER.map((rank) => {
                const u = podium.find((x) => x.rank === rank);
                if (!u) return <div key={rank} className="flex-1" />;
                const isFirst = rank === 1;
                const medal = rank === 1
                  ? { ring: "ring-amber-400", glow: "shadow-[0_0_24px_rgba(251,191,36,0.55)]", pillar: "from-amber-400 to-amber-600", emoji: "👑" }
                  : rank === 2
                  ? { ring: "ring-slate-300", glow: "", pillar: "from-slate-300 to-slate-500", emoji: "🥈" }
                  : { ring: "ring-orange-400", glow: "", pillar: "from-orange-400 to-orange-600", emoji: "🥉" };
                return (
                  <motion.div key={u.id} layout
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    className={`relative flex flex-1 flex-col items-center ${isFirst ? "order-2 -mt-3" : rank === 2 ? "order-1" : "order-3"}`}>
                    <div className="mb-1 text-2xl">{medal.emoji}</div>
                    <div className={`relative flex ${isFirst ? "h-16 w-16 text-xl" : "h-14 w-14 text-lg"} items-center justify-center overflow-hidden rounded-full font-bold ${avatarBg(u.id)} ring-4 ${medal.ring} ring-offset-2 ${medal.glow}`}>
                      {u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : (u.name?.[0] || "😋")}
                    </div>
                    <p className="mt-2 max-w-[96px] truncate text-center text-sm font-bold">{u.name}</p>
                    <p className="text-center text-xs text-primary">{u.title}</p>
                    <p className="mt-0.5 flex items-center gap-0.5 text-sm font-bold text-primary"><Zap className="h-3 w-3" />{u.xp}</p>
                    <div className={`mt-2 w-full rounded-t-2xl bg-gradient-to-b ${medal.pillar} ${isFirst ? "h-24" : "h-16"} flex items-start justify-center pt-2`}>
                      <span className="text-lg font-extrabold text-white/95">{rank}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Live ticker list */}
          {rest.length > 0 && (
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground">อันดับ 4 - {(data?.top || []).length}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{(data?.top || []).length}/100</span>
            </div>
          )}
          <div className="space-y-2">
            {rest.map((u) => (
              <motion.div key={u.id} layout
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className={`flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm ${flashIds.has(u.id) ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{u.rank}</span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${avatarBg(u.id)}`}>{u.name?.[0] || "😋"}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-primary">{u.title}</p>
                </div>
                {dirs[u.id] === "up" && <ChevronUp className="h-4 w-4 text-emerald-500" />}
                {dirs[u.id] === "down" && <ChevronDown className="h-4 w-4 text-red-400" />}
                <span className={`flex items-center gap-1 text-sm font-bold ${flashIds.has(u.id) ? "text-primary animate-pulse" : "text-foreground"}`}>
                  <Zap className="h-3.5 w-3.5" />{u.xp}
                </span>
              </motion.div>
            ))}
            {rest.length === 0 && podium.length === 0 && (
              <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">ยังไม่มีผู้เล่นในกระดานนี้</div>
            )}
          </div>

          {/* Sticky personal rank */}
          {me && (
            <div className="fixed bottom-16 left-0 right-0 z-30 px-4">
              <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-foreground p-3 text-background shadow-lg">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">#{me.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">คุณ · {me.name}</p>
                  <p className="truncate text-xs opacity-80">
                    {me.rank === 1 ? "👑 คุณคือแชมป์เปียน! รักษาอันดับไว้" :
                      me.gap != null ? `ต้องการอีกแค่ ${me.gap} XP เพื่อแซงอันดับ #${me.nextRank}` :
                      "ติด Top 100 แล้ว สู้ต่อไป!"}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-bold text-primary"><Zap className="h-3.5 w-3.5" />{me.xp}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}