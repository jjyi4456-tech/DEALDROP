import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { MapPin, LogOut, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const GPS_KEY = "hb_gps_consent";

// User settings: GPS/location consent toggle (PDPA transparency) + log out.
export default function SettingsCard() {
  const [gpsConsent, setGpsConsent] = useState(() => localStorage.getItem(GPS_KEY) !== "off");
  const [loggingOut, setLoggingOut] = useState(false);
  const { toast } = useToast();

  const toggleGps = (on) => {
    setGpsConsent(on);
    localStorage.setItem(GPS_KEY, on ? "on" : "off");
    toast({
      title: on ? "เปิดการเข้าถึง GPS" : "ปิดการเข้าถึง GPS",
      description: on
        ? "แอปใช้พิกัดเพื่อเช็คอินได้ตามปกติ"
        : "ฟีเจอร์เช็คอินที่ต้องใช้พิกัดจะไม่ทำงาน (PDPA)",
    });
  };

  const logout = async () => {
    setLoggingOut(true);
    await base44.auth.logout();
    window.location.href = "/login";
  };

  return (
    <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">การตั้งค่า</h3>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></div>
          <div>
            <p className="text-sm font-medium">การเข้าถึงพิกัด (GPS)</p>
            <p className="text-xs text-muted-foreground">ใช้สำหรับเช็คอินภารกิจ · ปิดเพื่อความเป็นส่วนตัว (PDPA)</p>
          </div>
        </div>
        <Switch checked={gpsConsent} onCheckedChange={toggleGps} aria-label="เปิด/ปิด GPS" />
      </div>

      <div className="my-3 h-px bg-border" />

      <button onClick={logout} disabled={loggingOut} className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left hover:bg-accent disabled:opacity-60">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><LogOut className="h-4 w-4" /></div>
          <div>
            <p className="text-sm font-medium text-destructive">ออกจากระบบ</p>
            <p className="text-xs text-muted-foreground">ออกจากบัญชีและกลับสู่หน้าเข้าสู่ระบบ</p>
          </div>
        </div>
      </button>
    </div>
  );
}