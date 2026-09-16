import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Crown, Loader2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const monthLabel = (key) => {
  const [y, m] = (key || "").split("-");
  return m ? `${MONTH_NAMES[parseInt(m) - 1]} ${y}` : "";
};

// Compact "เจ้าถิ่นประจำร้าน" mini-card: glowing orange-ringed avatar of the
// current mayor + a challenge micro-copy that nudges the viewer to overtake.
// The full local leaderboard is tucked behind a toggle (progressive disclosure).
export default function MayorCard({ merchantId, merchantName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getCafeMayor", { merchant_id: merchantId });
      setData(res?.data ?? res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [merchantId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border bg-card p-4 text-xs text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> กำลังหาเจ้าถิ่น...
      </div>
    );
  }
  if (!data) return null;

  const { mayor, top, my_count, my_rank, month } = data;
  const label = monthLabel(month);

  // Challenge micro-copy
  let challenge = "";
  if (!mayor) challenge = `เช็คอิน 1 ครั้งเพื่อคว้าตำแหน่งเจ้าถิ่นเป็นคนแรกของเดือน${label}!`;
  else if (mayor.is_me) challenge = "👑 คุณครองตำแหน่งเจ้าถิ่นของร้านนี้อยู่ รักษาบัลลังก์ไว้!";
  else {
    const need = Math.max(1, (mayor.count || 0) - (my_count || 0) + 1);
    challenge = `คุณต้องการอีก ${need} Check-in เพื่อแย่งตำแหน่งเจ้าถิ่น!`;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 p-4">
        {/* Glowing avatar with crown */}
        <div className="relative flex-shrink-0">
          <div className="absolute -inset-1 rounded-full bg-orange-400/40 blur-md" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 p-0.5">
            {mayor?.avatar ? (
              <img src={mayor.avatar} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-lg font-bold text-orange-600">
                {mayor ? (mayor.name || "?").charAt(0) : "👑"}
              </div>
            )}
          </div>
          {mayor && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 shadow ring-2 ring-white">
              <Crown className="h-3.5 w-3.5 text-white" />
            </span>
          )}
        </div>

        {/* Mayor info + challenge micro-copy */}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-semibold text-orange-500"><Crown className="h-3 w-3" /> เจ้าถิ่นประจำร้าน · {label}</p>
          <p className="truncate text-sm font-bold leading-tight">{mayor ? mayor.name : "ยังไม่มีเจ้าถิ่น"}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{challenge}</p>
        </div>
      </div>

      {/* Progressive disclosure: local leaderboard toggle */}
      {top && top.length > 0 && (
        <>
          <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-center gap-1 border-t bg-muted/30 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50">
            ดูอันดับเช็คอิน <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-1 p-3">
                  {top.map((t) => (
                    <div key={t.user_id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${t.is_me ? "bg-primary/10 font-semibold text-primary" : ""}`}>
                      <span className="w-5 text-center text-xs font-bold">{t.rank === 1 ? "🥇" : t.rank === 2 ? "🥈" : t.rank === 3 ? "🥉" : t.rank}</span>
                      {t.avatar ? <img src={t.avatar} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">{(t.name || "?").charAt(0)}</div>}
                      <span className="flex-1 truncate">{t.name} {t.is_me && <span className="text-xs">(คุณ)</span>}</span>
                      <span className="text-xs text-muted-foreground">{t.count} ครั้ง</span>
                    </div>
                  ))}
                  {my_rank && my_rank > top.length && (
                    <div className="mt-1 rounded-lg bg-muted/50 px-2 py-1.5 text-center text-xs text-muted-foreground">อันดับคุณ: #{my_rank} · {my_count} ครั้ง</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}