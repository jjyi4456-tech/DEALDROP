import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Mobile pull-to-refresh wrapper. Listens to touch on the window scroll
// container; when the user pulls down at the top beyond a threshold it shows a
// spinner and calls onRefresh. No-op on desktop (no touch events) — purely
// additive and does not change web scrolling behaviour.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const state = useRef({ startY: 0, pulling: false, pull: 0, refreshing: false });
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const s = state.current;
    const onStart = (e) => {
      if (window.scrollY > 0 || s.refreshing) return;
      s.startY = e.touches[0].clientY;
      s.pulling = true;
    };
    const onMove = (e) => {
      if (!s.pulling || s.refreshing) return;
      const delta = e.touches[0].clientY - s.startY;
      if (delta > 0 && window.scrollY <= 0) {
        s.pull = Math.min(90, delta * 0.5);
        setPull(s.pull);
      } else if (delta <= 0 && s.pull !== 0) {
        s.pull = 0;
        setPull(0);
      }
    };
    const onEnd = async () => {
      if (!s.pulling) return;
      s.pulling = false;
      if (s.pull > 55) {
        s.refreshing = true;
        setRefreshing(true);
        setPull(40);
        try {
          await onRefreshRef.current();
        } finally {
          s.refreshing = false;
          s.pull = 0;
          setRefreshing(false);
          setPull(0);
        }
      } else {
        s.pull = 0;
        setPull(0);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  const pct = Math.min(1, pull / 55);
  const animate = refreshing || !state.current.pulling;
  const transition = animate ? "transform 0.2s ease, opacity 0.2s ease" : "none";

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 flex justify-center"
        style={{ top: 0, transform: `translateY(${pull - 44}px)`, transition }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border bg-card shadow-sm"
          style={{ opacity: refreshing ? 1 : pct, transition: "opacity 0.2s ease" }}
        >
          <Loader2 className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`} />
        </div>
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition }}>
        {children}
      </div>
    </div>
  );
}