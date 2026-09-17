import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, Zap, Target, Wallet, Trash2, AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ImageUpload from "@/components/shared/ImageUpload";
import EditProfileSheet from "@/components/user/EditProfileSheet";
import BadgesSection from "@/components/user/BadgesSection";
import SettingsCard from "@/components/user/SettingsCard";
import { useToast } from "@/components/ui/use-toast";

const XP_PER_LEVEL = 500;
const levelTitle = (lv) =>
  ({ 1: "นักล่ามือใหม่", 2: "นักล่ามือใหม่", 3: "นักล่าชาญฉลาด", 4: "นักล่าเชี่ยวชาญ", 5: "มืออาชีพ" }[lv] || "นักล่าตำนาน");

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    try {
      setUser(await base44.auth.me());
    } catch {
      setUser({ full_name: "นักล่า", level: 1, xp: 0, total_checkins: 0 });
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const level = user.level || 1;
  const xp = user.xp || 0;
  const xpInLevel = xp % XP_PER_LEVEL;
  const pct = (xpInLevel / XP_PER_LEVEL) * 100;
  const quests = user.total_checkins || 0;
  const saved = quests * 45;

  const onAvatar = async (url) => {
    await base44.auth.updateMe({ avatar: url });
    setUser((u) => ({ ...u, avatar: url }));
    toast({ title: "อัปเดตรูปโปรไฟล์แล้ว" });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      // Delete this user's data server-side before clearing the session.
      await base44.functions.invoke("deleteAccount", {});
    } catch {
      setDeleting(false);
      setShowDelete(false);
      toast({ title: "ลบข้อมูลไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" });
      return;
    }
    setShowDelete(false);
    // Session cleanup: clear token and return to login.
    await base44.auth.logout();
    window.location.href = "/login";
  };

  return (
    <div className="space-y-0">
      {/* Header & Greeting */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">สวัสดี,</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{user.full_name || "นักล่า"}</h1>
            <button
              onClick={() => setSheetOpen(true)}
              className="rounded-lg p-2.5 text-primary hover:bg-primary/10"
              aria-label="แก้ไขข้อมูลส่วนตัว"
            >
              <Pencil className="h-5 w-5" />
            </button>
          </div>
          {user.email && <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>}
        </div>
        <ImageUpload value={user.avatar} onChange={onAvatar} shape="circle" className="h-16 w-16" />
      </div>

      {/* Level & Progress Card — purple gradient status theme */}
      <div className="mb-4 relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-5 text-white shadow-lg shadow-violet-500/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-violet-700 shadow-sm">Lv.{level}</span>
            <span className="text-sm font-medium text-white/90">{levelTitle(level)}</span>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur">นักล่าภารกิจ</span>
        </div>
        <div className="relative mt-4">
          <div className="mb-1.5 flex items-end justify-between">
            <span className="text-lg font-bold">{xpInLevel}<span className="text-sm font-normal text-white/70"> / {XP_PER_LEVEL} XP</span></span>
            <span className="text-xs text-white/80">อีก {XP_PER_LEVEL - xpInLevel} XP อัปเลเวล</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-3 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Achievement Grid — prominent tinted stat cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-center shadow-sm">
          <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Zap className="h-5 w-5" /></div>
          <p className="text-2xl font-extrabold text-primary drop-shadow-sm">{xp.toLocaleString()}</p>
          <p className="text-xs font-medium text-amber-700/80">XP รวม</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 text-center shadow-sm">
          <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><Target className="h-5 w-5" /></div>
          <p className="text-2xl font-extrabold text-indigo-600 drop-shadow-sm">{quests}</p>
          <p className="text-xs font-medium text-indigo-700/80">ภารกิจสำเร็จ</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-center shadow-sm">
          <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Wallet className="h-5 w-5" /></div>
          <p className="text-2xl font-extrabold text-emerald-600 drop-shadow-sm">฿{saved.toLocaleString()}</p>
          <p className="text-xs font-medium text-emerald-700/80">ประหยัดไปแล้ว</p>
        </div>
      </div>

      {/* Badges */}
      <BadgesSection user={user} />

      {/* Reward Wallet shortcut */}
      <Link to="/user/bag" className="mb-6 flex items-center justify-between rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Wallet className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold">กระเป๋ารางวัล</p>
            <p className="text-xs text-muted-foreground">ดูคูปองส่วนลดที่พร้อมใช้งานและที่ใช้แล้ว</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      {/* Settings */}
      <SettingsCard />

      {/* Danger Zone — account deletion */}
      <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">ลบบัญชี</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              การลบบัญชีจะล้างเซสชันและสิทธิ์การเข้าถึงของคุณ คุณจะไม่สามารถเข้าสู่ระบบด้วยบัญชีนี้ได้อีกจนกว่าจะสมัครใหม่
            </p>
            <button
              onClick={() => setShowDelete(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> ลบบัญชีของฉัน
            </button>
          </div>
        </div>
      </div>

      <EditProfileSheet open={sheetOpen} onOpenChange={setSheetOpen} user={user} onSaved={load} />

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-center text-lg font-bold">ยืนยันการลบบัญชี</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              ข้อมูลของคุณ (คูปอง, XP, สัตว์เลี้ยง, ประวัติการเช็คอิน) จะถูกลบและไม่สามารถกู้คืนได้
              ระบบจะทำการล้างเซสชันและนำคุณกลับสู่หน้าเข้าสู่ระบบ
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowDelete(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-accent">
                ยกเลิก
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60">
                {deleting ? "กำลังลบ..." : "ลบบัญชี"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}