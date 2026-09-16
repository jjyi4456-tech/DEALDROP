import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import GoogleIcon from "@/components/GoogleIcon";

// Soft auth wall: guests tapping a quest CTA see this friendly dialog instead of
// a hard redirect. After login/register the user is sent back to the pending
// quest via ?returnTo (same-origin validated in safeReturnTo).
export default function SoftAuthDialog({ open, onOpenChange, questTitle, squad, returnTo }) {
  const navigate = useNavigate();
  const regPath = `/register?returnTo=${encodeURIComponent(returnTo)}`;
  const loginPath = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl text-center">
        <span className="mx-auto mt-2 block text-4xl" aria-hidden="true">🦊</span>
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">เข้าสู่ระบบเพื่อเริ่มล่าภารกิจนี้ 🎯</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {questTitle ? `ภารกิจ “${questTitle}”` : "ภารกิจพิเศษ"}
            {squad ? " · โหมดชวนเพื่อนตั้งตี้" : ""} — สมัครฟรี ไม่มีค่าใช้จ่าย
            แล้วระบบจะพาคุณกลับมาที่ภารกิจนี้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <button
          onClick={() => base44.auth.loginWithProvider("google", returnTo)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border bg-card py-3 text-sm font-bold shadow-sm transition hover:bg-accent"
        >
          <GoogleIcon className="h-5 w-5" />
          เข้าสู่ระบบด้วย Google
        </button>

        <button
          onClick={() => navigate(regPath)}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-95"
        >
          สมัครสมาชิกฟรี
        </button>

        <p className="mt-2 text-xs text-muted-foreground">
          มีบัญชีแล้ว?{" "}
          <Link to={loginPath} className="font-bold text-primary hover:underline">
            เข้าสู่ระบบด้วยอีเมล
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}