import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Award, Lock } from "lucide-react";

// Achievement badges. Pulled from the Badge entity; each badge is shown as
// unlocked or locked based on the user's current stats vs. the badge threshold.
export default function BadgesSection({ user }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setBadges(await base44.entities.Badge.list());
      } catch {
        setBadges([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const quests = user?.total_checkins || 0;
  const level = user?.level || 1;
  const isUnlocked = (b) => {
    const c = String(b.condition || "").toLowerCase();
    if (c.includes("level") || c.includes("เลเวล")) return level >= (b.threshold || 1);
    return quests >= (b.threshold || 1);
  };

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        กำลังโหลดเหรียญตรา...
      </div>
    );
  }
  if (badges.length === 0) return null;

  const unlocked = badges.filter(isUnlocked);
  return (
    <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">เหรียญตราสัญลักษณ์</h3>
        </div>
        <span className="text-xs text-muted-foreground">{unlocked.length}/{badges.length} ปลดล็อก</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {badges.slice(0, 8).map((b) => {
          const open = isUnlocked(b);
          return (
            <div key={b.id} className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center ${open ? "bg-amber-50" : "bg-muted/40 opacity-60"}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${open ? "bg-amber-100" : "bg-muted"}`}>
                {open ? (b.icon || "🏆") : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="text-xs font-medium leading-tight">{b.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}