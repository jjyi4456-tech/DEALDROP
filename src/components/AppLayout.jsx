import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { NAV, PERSONAS } from "@/lib/navConfig";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowLeft } from "lucide-react";
import UserAvatarButton from "@/components/user/UserAvatarButton";
import AnimatedOutlet from "@/components/AnimatedOutlet";
import ConsentBanner from "@/components/legal/ConsentBanner";

const USER_TITLES = { "/user": "หน้าแรก", "/user/checkin": "แผนที่ & ภารกิจ", "/user/leaderboard": "กระดานผู้นำ", "/user/map": "แผนที่อาณาเขต", "/user/pet": "สัตว์เลี้ยง", "/user/bag": "กระเป๋าเป้", "/user/profile": "โปรไฟล์" };

export default function AppLayout({ persona }) {
  const config = NAV[persona];
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Per-tab navigation stacks (user app): switching tabs returns you to where
  // you left off in that tab instead of always resetting to the tab root.
  // Standalone pages (/user/profile, /user/wallet) belong to NO tab, so they
  // never pollute a tab's stack — otherwise clicking the home tab while on a
  // standalone page would keep you trapped on that page.
  const tabStacks = useRef({});
  const NESTED_TABS = ["/user/checkin", "/user/leaderboard", "/user/map", "/user/pet", "/user/bag"];
  const tabOf = (path) => {
    if (path === "/user") return "/user";
    const sub = NESTED_TABS.find((t) => path === t || path.startsWith(t + "/"));
    return sub || null;
  };
  const currentTab = tabOf(location.pathname);
  useEffect(() => {
    const tab = tabOf(location.pathname);
    if (!tab) return; // standalone page — don't pollute any tab stack
    const stack = tabStacks.current[tab] || (tabStacks.current[tab] = [tab]);
    if (stack[stack.length - 1] !== location.pathname) stack.push(location.pathname);
    if (stack.length > 20) stack.shift();
  }, [location.pathname]);
  const handleTab = (item) => {
    const stack = tabStacks.current[item.to] || (tabStacks.current[item.to] = [item.to]);
    navigate(stack[stack.length - 1]);
  };

  // User app: mobile-first feed with bottom navigation bar (5 tabs)
  if (persona === "user") {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center border-b border-stone-200/60 bg-white/85 px-4 backdrop-blur-lg safe-top">
          {location.pathname !== "/user" && (
            <button onClick={() => navigate(-1)} className="-ml-2 mr-1 rounded-lg p-2.5 text-foreground hover:bg-accent" aria-label="ย้อนกลับ">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-lg font-bold">{USER_TITLES[location.pathname] || "DEALDROP"}</h1>
        </div>
        <UserAvatarButton />
        <main className="mx-auto max-w-md px-4 pt-16 pb-28">
          <AnimatedOutlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
          <div className="mx-auto mb-4 flex max-w-md items-center justify-around gap-1 rounded-full border border-stone-200/80 bg-white/85 p-1.5 shadow-[0_10px_32px_rgba(0,0,0,0.16)] backdrop-blur-lg">
            {config.items.map((item) => {
              const active = currentTab === item.to;
              return (
                <button
                  key={item.to}
                  onClick={() => handleTab(item)}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-xs transition-all ${
                    active ? "bg-primary/10 font-bold text-primary" : "font-medium text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
        <ConsentBanner bottomClass="bottom-24" />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold">F</div>
          <div>
            <p className="text-sm font-bold leading-tight">FoodieQuest</p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {config.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">สลับฝั่ง</p>
        <div className="space-y-1">
          {PERSONAS.filter((p) => p.key !== persona).map((p) => (
            <NavLink
              key={p.key}
              to={p.path}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              <p.icon className="h-4 w-4" />
              {p.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r bg-background">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(!open)} className="rounded-lg p-2 hover:bg-accent">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-sm font-bold">{config.label}</span>
          <div className="w-9" />
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <AnimatedOutlet />
        </main>
      </div>
      <ConsentBanner />
    </div>
  );
}