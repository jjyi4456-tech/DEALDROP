import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, WifiOff, Loader2, Store } from "lucide-react";
import QRCode from "qrcode";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// Counter display: a Dynamic QR that rotates every 15s (HMAC token from the
// server). Works offline temporarily by keeping the last valid QR visible.
const REFRESH_LEAD_MS = 1200; // fetch the next token before the current one dies

export default function LiveQr() {
  const { toast } = useToast();
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null); // { token, expires_at, window_ms, server_time }
  const [qrUrl, setQrUrl] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [offline, setOffline] = useState(false);
  const skewRef = useRef(0); // device clock vs server clock
  const aliveRef = useRef(true);

  // Load this account's merchant
  useEffect(() => {
    aliveRef.current = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        const merchants = await base44.entities.Merchant.list();
        setMerchant(merchants.find((m) => m.created_by_id === me.id) || null);
      } catch {
        toast({ title: "โหลดข้อมูลร้านไม่สำเร็จ", variant: "destructive" });
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    })();
    return () => { aliveRef.current = false; };
  }, [toast]);

  // Token rotation loop: refresh just before the current window expires
  useEffect(() => {
    if (!merchant) return;
    aliveRef.current = true;
    let timer = null;
    const skewNow = () => Date.now() - skewRef.current;

    const scheduleNext = (expiresAt) => {
      const delay = Math.max(1000, expiresAt - skewNow() - REFRESH_LEAD_MS);
      timer = setTimeout(() => fetchToken(false), delay);
    };

    const fetchToken = async (isRetry) => {
      if (!aliveRef.current) return;
      try {
        const res = await base44.functions.invoke("generateLiveQrToken", { merchant_id: merchant.id });
        const info = res?.data || res;
        if (!info?.token) throw new Error("no token");
        if (!aliveRef.current) return;
        skewRef.current = Date.now() - (info.server_time || Date.now());
        const url = await QRCode.toDataURL(
          JSON.stringify({ v: 2, m: merchant.id, t: info.token, e: info.expires_at }),
          { width: 720, margin: 2, color: { dark: "#1f2937", light: "#ffffff" } }
        );
        if (!aliveRef.current) return;
        setToken(info);
        setQrUrl(url);
        setOffline(false);
        scheduleNext(info.expires_at);
      } catch {
        if (!aliveRef.current) return;
        if (!isRetry) {
          setOffline(true);
          toast({ title: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", description: "แสดง QR ล่าสุดไว้ก่อน กำลังลองใหม่...", variant: "destructive" });
        }
        timer = setTimeout(() => fetchToken(true), 3000);
      }
    };

    fetchToken(false);
    return () => { aliveRef.current = false; if (timer) clearTimeout(timer); };
  }, [merchant, toast]);

  // Countdown for the current window
  useEffect(() => {
    if (!token) return;
    const tick = () => setRemaining(Math.max(0, token.expires_at - (Date.now() - skewRef.current)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-10 text-center shadow-sm">
        <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-bold">ยังไม่พบร้านค้าของคุณ</p>
        <p className="mt-1 text-sm text-muted-foreground">กรุณาสมัครและตั้งค่าร้านก่อนใช้งานจอ Dynamic QR</p>
      </div>
    );
  }

  const [mode, setMode] = useState("dynamic"); // dynamic | static
  const [staticQrUrl, setStaticQrUrl] = useState(null);

  useEffect(() => {
    if (merchant?.id) {
      QRCode.toDataURL(`hb:shop:${merchant.id}`, {
        width: 720,
        margin: 2,
        color: { dark: "#1f2937", light: "#ffffff" },
      }).then(setStaticQrUrl).catch(() => {});
    }
  }, [merchant?.id]);

  const progress = token ? Math.max(0, Math.min(1, remaining / (token.window_ms || 15000))) : 0;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold">📱 จอ QR เช็คอินหน้าร้าน</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          แสดง QR Code ให้ลูกค้าสแกนเช็คอินเพื่อรับสิทธิ์และพาไปสั่งอาหารที่โต๊ะ
        </p>

        {/* Mode Selector */}
        <div className="mt-4 inline-flex rounded-2xl bg-muted p-1 border">
          <button
            onClick={() => setMode("dynamic")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              mode === "dynamic" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ⚡ Dynamic QR (เปลี่ยนทุก 15 วิ - กันโกง)
          </button>
          <button
            onClick={() => setMode("static")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              mode === "static" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🖨️ QR ถาวรประจำร้าน (พิมพ์ตั้งโต๊ะ/หน้าร้าน)
          </button>
        </div>
      </div>

      <div className={`rounded-3xl border bg-card p-6 shadow-sm transition-colors ${offline ? "border-red-300" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">ร้านค้า</p>
            <p className="text-lg font-bold">{merchant.name}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" /> {mode === "dynamic" ? "ป้องกัน Fake GPS & บันทึกจอ" : "QR ประจำสาขา"}
          </span>
        </div>

        {mode === "dynamic" ? (
          <>
            <AnimatePresence>
              {offline && (
                <motion.div
                  key="offline-banner"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    <p className="flex items-center gap-2 font-semibold">
                      <WifiOff className="h-4 w-4" /> ออฟไลน์ชั่วคราว
                    </p>
                    <p className="mt-0.5 text-xs">ยังแสดง QR ล่าสุดไว้ หากลูกค้าสแกนไม่ผ่าน ให้รอเชื่อมต่อกลับมาก่อน</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex justify-center">
              <motion.div
                key={token?.token || "qr"}
                initial={{ opacity: 0.4, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="w-full max-w-sm"
              >
                {qrUrl ? (
                  <img src={qrUrl} alt="Dynamic QR" className={`w-full rounded-2xl ${offline ? "opacity-60" : ""}`} />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">รหัสเปลี่ยนในอีก</span>
                <span className="font-mono font-bold text-primary">{(remaining / 1000).toFixed(1)} วิ</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-primary transition-[width] duration-200 ease-linear"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                รหัสเปลี่ยนทุก 15 วินาที · ใช้ได้ครั้งเดียว ป้องกันการส่งต่อให้คนอื่น
              </p>
            </div>
          </>
        ) : (
          <div className="mt-4 text-center">
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                {staticQrUrl ? (
                  <img src={staticQrUrl} alt="Static Shop QR" className="w-full rounded-2xl border" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              สามารถแคปหน้าจอหรือดาวน์โหลด QR นี้พิมพ์ติดหน้าร้าน หรือตั้งไว้ที่โต๊ะได้ถาวร
            </p>
            {staticQrUrl && (
              <a
                href={staticQrUrl}
                download={`shop-qr-${merchant.id.slice(0, 6)}.png`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
              >
                📥 ดาวน์โหลดรูป QR
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}