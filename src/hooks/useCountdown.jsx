import { useEffect, useState } from "react";

// Live countdown to an ISO expires_at; ticks every second, floors at 0.
export default function useCountdown(expiresAt) {
  const [msLeft, setMsLeft] = useState(() =>
    expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0
  );

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setMsLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return msLeft;
}

// 4820000 -> "48:20"
export const fmtMMSS = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};