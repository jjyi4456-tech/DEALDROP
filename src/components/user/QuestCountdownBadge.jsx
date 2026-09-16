import { useEffect, useState } from "react";
import { TimerReset } from "lucide-react";
import { bkDate } from "@/lib/questTime";

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

// Live countdown to the quest's window close (end_time, Bangkok timezone).
// Renders nothing when endTime is missing or already past.
export default function QuestCountdownBadge({ endTime }) {
  const [msLeft, setMsLeft] = useState(() => (endTime ? msUntil(endTime) : null));

  useEffect(() => {
    if (!endTime) return;
    const tick = () => setMsLeft(msUntil(endTime));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (!endTime || msLeft == null) return null;
  if (msLeft <= 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500">
        <TimerReset className="h-3 w-3" /> หมดเวลา
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
      <TimerReset className="h-3 w-3" /> เหลือ {fmt(msLeft)}
    </span>
  );
}

// Milliseconds from now until today's Bangkok `endTime` ("HH:MM").
const msUntil = (endTime) => {
  const ts = new Date(`${bkDate()}T${endTime}:00+07:00`).getTime();
  if (Number.isNaN(ts)) return null;
  return ts - Date.now();
};