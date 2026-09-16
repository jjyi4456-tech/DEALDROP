import { useAuth } from "@/lib/AuthContext";
import { Clock, LogOut } from "lucide-react";

export default function PendingApproval() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
        <Clock className="h-10 w-10 text-amber-600" />
      </div>
      <h1 className="mt-5 text-2xl font-bold">รอการอนุมัติจากผู้ดูแลระบบ</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        บัญชีพาร์ทเนอร์ร้านค้าของคุณ ({user?.email}) ได้ส่งคำขอเรียบร้อยแล้ว
        ทีมงานกำลังตรวจสอบ เมื่ออนุมัติแล้วคุณจะสามารถเข้าใช้งานแดชบอร์ดร้านค้าได้
      </p>
      <button
        onClick={() => logout()}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background"
      >
        <LogOut className="h-4 w-4" /> ออกจากระบบ
      </button>
    </div>
  );
}