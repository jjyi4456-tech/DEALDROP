import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function UserAvatarButton() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => setMe(null));
  }, []);
  const initial = (me?.full_name || me?.email || "U").trim().charAt(0).toUpperCase();
  const nick = (me?.full_name || "").trim().split(/\s+/)[0] || "";
  return (
    <Link to="/user/profile" className="fixed right-4 top-4 z-40 flex items-center gap-2" aria-label="โปรไฟล์">
      {nick && (
        <span className="rounded-full border border-stone-200/60 bg-white/85 px-3 py-1.5 text-xs font-bold text-stone-700 shadow-sm backdrop-blur-lg">
          {nick}
        </span>
      )}
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg transition active:scale-95">
        {me?.avatar_url ? (
          <img src={me.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold">{initial || <UserRound className="h-5 w-5" />}</span>
        )}
      </span>
    </Link>
  );
}