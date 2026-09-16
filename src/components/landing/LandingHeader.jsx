import { Link } from "react-router-dom";
import { Store, LogIn } from "lucide-react";

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🦊</span>
          <span className="text-lg font-extrabold tracking-tight">DEALDROP</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/register?role=merchant"
            className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition hover:bg-accent sm:text-sm"
          >
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">สำหรับร้านค้า</span>
            <span className="sm:hidden">ร้านค้า</span>
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow transition hover:bg-primary/90 sm:text-sm"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">เข้าสู่ระบบ / สมัครสมาชิก</span>
            <span className="sm:hidden">เข้าสู่ระบบ</span>
          </Link>
        </div>
      </div>
    </header>
  );
}