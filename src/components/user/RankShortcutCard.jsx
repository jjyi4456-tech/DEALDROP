import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Compact shortcut card on the user home: current XP rank + link to the leaderboard.
export default function RankShortcutCard() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke("getLeaderboard", { period: "all" })
      .then((res) => setMe(res?.data?.me || res?.me || null))
      .catch(() => {});
  }, []);

  if (!me) return null;

  return (
    <Link
      to="/user/leaderboard"
      className="mb-4 flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-sm transition hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">🏆</span>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">อันดับของคุณ</p>
        <p className="text-sm font-bold">#{me.rank} · {me.xp} XP</p>
      </div>
      <span className="flex items-center gap-0.5 text-xs font-bold text-primary">
        ดูกระดานผู้นำ <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}