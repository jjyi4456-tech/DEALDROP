import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dices, TimerReset } from "lucide-react";
import { getCooldownRemaining, fmtCountdown } from "@/lib/mystery";

// Inline "กินอะไรดี?" action row — opens the Mystery Food Drop flow.
// Shows a 30-minute countdown after the user cancels a revealed mystery quest.
export default function MysteryDropFab() {
  const [cooldown, setCooldown] = useState(getCooldownRemaining());

  useEffect(() => {
    const id = setInterval(() => setCooldown(getCooldownRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  if (cooldown > 0) {
    return (
      <div className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm font-medium text-muted-foreground">
        <TimerReset className="h-4 w-4" />
        <span>กินอะไรดี? รออีก {fmtCountdown(cooldown)}</span>
      </div>
    );
  }

  return (
    <Link
      to="/user/mystery"
      className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-orange-400 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition active:scale-95"
    >
      <Dices className="h-5 w-5" />
      กินอะไรดี?
      <span className="text-xs font-medium opacity-90">สุ่มภารกิจรับ XP x2</span>
    </Link>
  );
}