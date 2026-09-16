import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  MapPin, Navigation, Zap, Gift, PartyPopper, X, AlertTriangle, TimerReset, Trophy, CheckCircle2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { haversineMeters } from "@/lib/geo";
import { parseShopQr, isQuestLiveNow } from "@/lib/questTime";
import ShopQrScanner from "@/components/user/ShopQrScanner";

const QUEST_DURATION_SEC = 45 * 60;
const DEFAULT_LAT = 13.7563;
const DEFAULT_LNG = 100.5018;

const rewardLabel = (q) =>
  q.reward_type === "percent" ? `ลด ${q.reward_value}%` :
  q.reward_type === "cash" ? `ลด ${q.reward_value}฿` : `แถม ${q.reward_value}`;

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const rndCode = () => "CPN-" + Math.random().toString(36).slice(2, 7).toUpperCase();

export default function CheckIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const questId = params.get("quest");
  const isMystery = params.get("mystery") === "1"; // Mystery Food Drop: XP x2 bonus
  const { toast } = useToast();

  const [liveQuest, setLiveQuest] = useState(null);
  const [shop, setShop] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, radius: 50 });
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState("intent"); // intent | active | success | full | timeout
  const [deadline, setDeadline] = useState(null);
  const [remaining, setRemaining] = useState(QUEST_DURATION_SEC);
  const [distance, setDistance] = useState(null);
  const [locating, setLocating] = useState(false);
  const [inRange, setInRange] = useState(false);
  const [flash, setFlash] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [reward, setReward] = useState(null);
  const prevLeftRef = useRef(null);

  // Load quest + shop + user + realtime subscription
  useEffect(() => {
    if (!questId) return;
    let unsub = () => {};
    (async () => {
      const q = await base44.entities.Quest.get(questId);
      setLiveQuest(q);
      prevLeftRef.current = q.capacity - (q.participants || 0);
      try {
        const me = await base44.auth.me();
        setUser(me);
        const merchants = await base44.entities.Merchant.list();
        const m = merchants.find((x) => x.id === q.merchant_id) || merchants.find((x) => x.name === q.merchant_name) || merchants[0];
        if (m && m.lat != null) setShop({ lat: m.lat, lng: m.lng, radius: m.geofence_radius || 50 });
      } catch { /* ignore */ }
    })();
    unsub = base44.entities.Quest.subscribe((event) => {
      if (event.data?.id !== questId) return;
      setLiveQuest(event.data);
    });
    return unsub;
  }, [questId]);

  // Flash red when quota drops (someone else checked in)
  useEffect(() => {
    if (!liveQuest) return;
    const left = liveQuest.capacity - (liveQuest.participants || 0);
    if (prevLeftRef.current != null && left < prevLeftRef.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1500);
      prevLeftRef.current = left;
      return () => clearTimeout(t);
    }
    prevLeftRef.current = left;
  }, [liveQuest]);

  // Countdown tick
  useEffect(() => {
    if (stage !== "active" || !deadline) return;
    const tick = () => {
      const r = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) {
        setStage("timeout");
        toast({ title: "หมดเวลาทำภารกิจ", description: "เวลาหมดก่อนเช็คอิน ลองรับภารกิจใหม่ได้", variant: "destructive" });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stage, deadline, toast]);

  // After a successful check-in, take the customer to the shop's ordering page
  useEffect(() => {
    if (stage !== "success" || !liveQuest?.merchant_id) return;
    const t = setTimeout(() => navigate(`/user/order/${liveQuest.merchant_id}`), 2200);
    return () => clearTimeout(t);
  }, [stage, liveQuest, navigate]);

  if (!questId) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">ไม่พบภารกิจที่เลือก</p>
        <Link to="/user" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">กลับหน้าค้นพบ</Link>
      </div>
    );
  }

  if (!liveQuest) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const left = liveQuest.capacity - (liveQuest.participants || 0);
  const full = left <= 0;

  // Optimistic: show the active stage immediately; sync the deadline from the
  // server in the background (falls back to device time if the call fails).
  const accept = () => {
    setStage("active");
    base44.functions
      .invoke("getServerTimestamp", {})
      .then((res) => setDeadline(new Date(res.data.timestamp).getTime() + QUEST_DURATION_SEC * 1000))
      .catch(() => setDeadline(Date.now() + QUEST_DURATION_SEC * 1000));
  };

  const cancel = () => {
    setStage("intent");
    setDeadline(null);
    setRemaining(QUEST_DURATION_SEC);
    setInRange(false);
    setDistance(null);
    toast({ title: "ยกเลิกภารกิจแล้ว", description: "ไม่มีการหักสิทธิ์ คุณรับภารกิจใหม่ได้" });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "อุปกรณ์ไม่รองรับ GPS", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = Math.round(haversineMeters(pos.coords.latitude, pos.coords.longitude, shop.lat, shop.lng));
        setDistance(d);
        setInRange(d <= shop.radius);
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast({ title: "ไม่สามารถระบุตำแหน่งได้", description: "ลองปุ่มจำลองเพื่อทดสอบ", variant: "destructive" });
      },
      { enableHighAccuracy: true }
    );
  };

  const simulateInRange = () => {
    setDistance(20);
    setInRange(true);
  };

  const checkin = async () => {
    // Optimistic: deduct one quota locally right away (with the processing
    // state) so the UI reacts instantly; rolled back if the API call fails.
    const snapshotQuest = liveQuest;
    const optimistic = { ...liveQuest, participants: (liveQuest.participants || 0) + 1 };
    prevLeftRef.current = optimistic.capacity - optimistic.participants;
    setLiveQuest(optimistic);
    setProcessing(true);
    try {
      const fresh = await base44.entities.Quest.get(questId);
      const freshLeft = fresh.capacity - (fresh.participants || 0);
      const xpReward = (fresh.xp_reward || 50) * (isMystery ? 2 : 1);

      if (freshLeft <= 0) {
        // Case 2: full — consolation prize
        await base44.auth.updateMe({ xp: (user?.xp || 0) + 20, total_checkins: (user?.total_checkins || 0) + 1 });
        await base44.entities.Coupon.create({
          user_id: user?.id, merchant_id: fresh.merchant_id, merchant_name: fresh.merchant_name, quest_id: fresh.id,
          title: "รางวัลปลอบใจ ลด 5%", reward_type: "percent", reward_value: "5",
          status: "available", qr_code: rndCode(), expiry_date: inDays(7),
        });
        setReward({ xp: 20, consolation: true, discount: "ลด 5%" });
        setStage("full");
        return;
      }

      // Case 1: quota remains — deduct 1, give reward
      await base44.entities.Quest.update(questId, { participants: (fresh.participants || 0) + 1 });
      const ci = await base44.entities.CheckIn.create({
        user_id: user?.id, merchant_id: fresh.merchant_id, merchant_name: fresh.merchant_name,
        quest_id: fresh.id, xp_earned: xpReward, lat: shop.lat, lng: shop.lng,
      });
      // Trigger rank-drop push to users we just overtook (delivers on native mobile build)
      if (ci?.id) base44.functions.invoke("notifyRankDrop", { checkin_id: ci.id }).catch(() => {});
      await base44.entities.Coupon.create({
        user_id: user?.id, merchant_id: fresh.merchant_id, merchant_name: fresh.merchant_name, quest_id: fresh.id,
        title: `${fresh.title} ${rewardLabel(fresh)}`, reward_type: fresh.reward_type, reward_value: String(fresh.reward_value),
        status: "available", qr_code: rndCode(), expiry_date: inDays(7),
      });
      await base44.auth.updateMe({ xp: (user?.xp || 0) + xpReward, total_checkins: (user?.total_checkins || 0) + 1 });
      // Gacha drop: roll one random F&B ingredient into the user's inventory.
      let drop = null;
      try {
        const dropRes = await base44.functions.invoke("rollCheckInIngredient", { checkin_id: ci.id });
        drop = dropRes?.data?.drop || dropRes?.drop || null;
      } catch { /* non-fatal: drop is a bonus, not a requirement */ }
      setReward({ xp: xpReward, discount: rewardLabel(fresh), drop });
      setStage("success");
    } catch (e) {
      // Rollback the optimistic quota deduction with the latest server state
      try { setLiveQuest(await base44.entities.Quest.get(questId)); } catch { setLiveQuest(snapshotQuest); }
      toast({ title: "เช็คอินไม่สำเร็จ", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const getPositionOnce = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("no geolocation"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
  });

  // Dual-factor check-in (v2 Dynamic QR): the server verifies the HMAC token,
  // burns it (anti-replay) and checks the geofence distance itself.
  const handleScan = async (text) => {
    setScanOpen(false);
    let dyn = null;
    try {
      const j = JSON.parse(text);
      if (j && j.v === 2 && j.t && j.m) dyn = j;
    } catch { /* legacy printed QR — handled below */ }

    if (dyn) {
      if (dyn.m !== liveQuest.merchant_id) {
        toast({ title: "QR ไม่ถูกต้อง", description: "QR Code นี้ไม่ใช่ของร้านนี้ กรุณาสแกนที่เคาน์เตอร์ของร้าน", variant: "destructive" });
        return;
      }
      let pos;
      try {
        pos = await getPositionOnce();
      } catch {
        toast({ title: "ไม่สามารถตรวจพิกัดขณะสแกน", description: "กรุณาเปิด GPS แล้วสแกนใหม่", variant: "destructive" });
        return;
      }
      const accuracy = pos.coords.accuracy || 0;
      setDistance(Math.round(haversineMeters(pos.coords.latitude, pos.coords.longitude, shop.lat, shop.lng)));
      if (accuracy > 100) {
        toast({ title: "สัญญาณ GPS ไม่แม่นยำ", description: `ความคลาดเคลื่อน ${Math.round(accuracy)} ม. เกินเกณฑ์ 100 ม. กรุณาออกมากลางแจ้งแล้วลองใหม่`, variant: "destructive" });
        return;
      }
      if (!isQuestLiveNow(liveQuest)) {
        toast({ title: "ภารกิจยังไม่เปิดหรือหมดเวลาแล้ว", variant: "destructive" });
        return;
      }
      setProcessing(true);
      try {
        const res = await base44.functions.invoke("secureCheckIn", {
          qr_token: dyn.t,
          merchant_id: dyn.m,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy,
          client_timestamp: Date.now(),
          quest_id: questId,
          mystery: isMystery ? 1 : 0,
        });
        const d = res?.data || res || {};
        if (d.status === "full") {
          setReward({ xp: d.xp || 20, consolation: true, discount: "ลด 5%" });
          setStage("full");
          return;
        }
        setLiveQuest((q) => ({ ...q, participants: d.participants != null ? d.participants : (q.participants || 0) + 1 }));
        setInRange(true);
        setReward({ xp: d.xp, discount: d.coupon ? rewardLabel(d.coupon) : "", drop: d.drop || null });
        setStage("success");
        if (d.checkin_id) base44.functions.invoke("notifyRankDrop", { checkin_id: d.checkin_id }).catch(() => {});
      } catch (e) {
        const payload = e?.response?.data || e?.data || {};
        const code = payload.error || "UNKNOWN";
        const messages = {
          TOKEN_MALFORMED: ["QR ไม่ถูกต้อง", "รูปแบบ QR ผิดพลาด กรุณาสแกนใหม่"],
          TOKEN_INVALID: ["QR ไม่ถูกต้อง", "ตรวจสอบลายเซ็นไม่สำเร็จ กรุณาสแกนใหม่"],
          TOKEN_EXPIRED: ["QR หมดอายุ", "รหัสเปลี่ยนทุก 15 วินาที กรุณาสแกนใหม่อีกครั้ง"],
          TOKEN_REUSED: ["QR ถูกใช้ไปแล้ว", "รหัสนี้ถูกใช้เช็คอินแล้ว รอรหัสใหม่บนจอแล้วสแกนใหม่"],
          OUT_OF_GEOFENCE: ["ต้องสแกนที่หน้าร้านจริง", `พิกัดขณะสแกนห่างร้าน ${payload.distance ?? "-"} ม. (เกินรัศมี ${payload.radius ?? "-"} ม.)`],
          LOW_GPS_ACCURACY: ["สัญญาณ GPS ไม่แม่นยำ", "ระบบปฏิเสธพิกัดที่คลาดเคลื่อนเกินเกณฑ์ กรุณาลองใหม่กลางแจ้ง"],
          RATE_LIMITED: ["พยายามเช็คอินถี่เกินไป", "ระบบล็อกชั่วคราว กรุณาลองใหม่ใน 5 นาที"],
          QUEST_NOT_ACTIVE: ["ภารกิจยังไม่เปิดหรือหมดเวลาแล้ว", ""],
          MERCHANT_NOT_AVAILABLE: ["ร้านนี้ไม่พร้อมให้เช็คอิน", ""],
          MERCHANT_LOCATION_NOT_SET: ["ร้านยังไม่ได้ตั้งพิกัด", "กรุณาแจ้งร้านให้ตั้งตำแหน่งก่อน"],
        };
        const [t, desc] = messages[code] || ["เช็คอินไม่สำเร็จ", payload.message || e?.message || ""];
        toast({ title: t, description: desc, variant: "destructive" });
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Legacy static shop QR (old printed QR codes) — unchanged flow
    const mId = parseShopQr(text);
    if (!mId || mId !== liveQuest.merchant_id) {
      toast({ title: "QR ไม่ถูกต้อง", description: "QR Code นี้ไม่ใช่ของร้านนี้ กรุณาสแกน QR ประจำร้าน", variant: "destructive" });
      return;
    }
    try {
      const pos = await getPositionOnce();
      const d = Math.round(haversineMeters(pos.coords.latitude, pos.coords.longitude, shop.lat, shop.lng));
      setDistance(d);
      if (d > shop.radius) {
        setInRange(false);
        toast({ title: "ต้องสแกน QR ที่หน้าเคาน์เตอร์ในร้าน", description: `พิกัดขณะสแกนห่าง ${d} ม. จากร้าน`, variant: "destructive" });
        return;
      }
      setInRange(true);
    } catch {
      toast({ title: "ไม่สามารถตรวจพิกัดขณะสแกน", description: "กรุณาเปิด GPS แล้วสแกนใหม่", variant: "destructive" });
      return;
    }
    if (!isQuestLiveNow(liveQuest)) {
      toast({ title: "ภารกิจยังไม่เปิดหรือหมดเวลาแล้ว", variant: "destructive" });
      return;
    }
    await checkin();
  };

  return (
    <div>
      {/* Quest summary */}
      <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight">{liveQuest.title}</h1>
            <p className="text-xs text-muted-foreground">{liveQuest.merchant_name}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{rewardLabel(liveQuest)}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">+{(liveQuest.xp_reward || 50) * (isMystery ? 2 : 1)} XP</span>
          {isMystery && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">🎁 ภารกิจลับ · XP x2</span>}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Phase 1: Intent */}
        {stage === "intent" && (
          <motion.div key="intent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-4 rounded-2xl border bg-card p-5 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">สิทธิ์คงเหลือ (อัปเดต Real-time)</p>
              <p className={`mt-1 text-4xl font-bold ${full ? "text-red-500" : "text-primary"} ${flash ? "animate-pulse" : ""}`}>
                เหลือ {left}/{liveQuest.capacity} สิทธิ์
              </p>
              <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div className={`h-2 rounded-full ${full ? "bg-red-500" : "bg-primary"}`} style={{ width: `${(left / liveQuest.capacity) * 100}%` }} />
              </div>
            </div>
            {full ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                <p className="font-bold text-red-600">สิทธิ์เต็มแล้ว</p>
                <p className="mt-1 text-sm text-muted-foreground">ภารกิจนี้ไม่มีสิทธิ์เหลือ ลองภารกิจอื่นได้</p>
                <Link to="/user" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">ดูภารกิจอื่น</Link>
              </div>
            ) : (
              <button onClick={accept} className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition active:scale-95">
                รับภารกิจ
              </button>
            )}
          </motion.div>
        )}

        {/* Phase 2 & 3: Active countdown + geofence */}
        {stage === "active" && (
          <motion.div key="active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Interactive Pulsing Radar */}
            <div className="relative mb-4 h-80 overflow-hidden rounded-3xl border border-stone-200/60 bg-gradient-to-b from-orange-50 via-[#FAF8F5] to-white shadow-sm">
              {/* expanding sonar rings */}
              {[0, 1, 2].map((i) => (
                <div key={i} className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    className="h-full w-full rounded-full border border-orange-300/70 bg-orange-200/25"
                    animate={{ scale: [1, 3.4], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 3.3, delay: i * 1.1, ease: "easeOut" }}
                  />
                </div>
              ))}
              {/* geofence circle */}
              <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-orange-400/50 bg-orange-100/40" />
              <span className="absolute left-1/2 top-[calc(50%+7.5rem)] -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-orange-500 shadow-sm">
                รัศมี {shop.radius} ม.
              </span>
              {/* shop pin */}
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-3xl shadow-lg shadow-orange-500/30"
                >
                  📍
                </motion.div>
              </div>
              {/* Floating chips: distance + live quota */}
              <div className={`absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur ${inRange ? "text-emerald-600" : "text-stone-500"}`}>
                <Navigation className="h-3.5 w-3.5" />
                {distance != null ? `${distance} ม.${inRange ? " · ในรัศมี" : ""}` : "ยังไม่ตรวจตำแหน่ง"}
              </div>
              <div className={`absolute right-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold shadow-md backdrop-blur ${flash ? "text-red-500 animate-pulse" : "text-stone-600"}`}>
                เหลือ {left}/{liveQuest.capacity} สิทธิ์
              </div>
            </div>

            {inRange && (
              <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25">
                <CheckCircle2 className="h-5 w-5" />
                คุณมาถึงร้านแล้ว! ห่าง {distance ?? 0} ม.
              </div>
            )}

            {/* Double Lock hint */}
            <div className="mb-3 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
              🔒 ระบบล็อก 2 ชั้น: GPS ปลดล็อกปุ่มสแกน → สแกน Dynamic QR บนจอหน้าเคาน์เตอร์ (รหัสเปลี่ยนทุก 15 วินาที ใช้ได้ครั้งเดียว)
            </div>

            {/* GPS + simulate */}
            <div className="mb-4 flex gap-2">
              <button onClick={detectLocation} disabled={locating} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary bg-white py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60">
                <Navigation className="h-4 w-4" /> {locating ? "กำลังตรวจจับ GPS..." : "ตรวจตำแหน่ง GPS"}
              </button>
              {!inRange && (
                <button onClick={simulateInRange} className="rounded-2xl bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/70">
                  จำลอง (ทดสอบ)
                </button>
              )}
            </div>

            {/* Big glowing scan button — thumb zone */}
            <button
              onClick={() => setScanOpen(true)}
              disabled={!inRange || processing}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-base font-bold transition active:scale-95 ${inRange ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30" : "bg-stone-200 text-stone-400"}`}
            >
              📷 {processing ? "กำลังประมวลผล..." : inRange ? "สแกน QR หน้าร้านเพื่อรับส่วนลด" : "ต้องอยู่ในรัศมีร้านก่อน"}
            </button>

            {/* Cute countdown under the button */}
            <div className="mt-3 flex justify-center">
              <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-stone-600 shadow-sm ring-1 ring-stone-200/60">
                ⏰ มีเวลาเช็คอินอีก <span className="font-mono text-base font-bold text-orange-500">{fmt(remaining)}</span> นาที
              </span>
            </div>

            <button onClick={cancel} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" /> ยกเลิกภารกิจ
            </button>
          </motion.div>
        )}

        {/* Phase 4 — Case 1: success */}
        {stage === "success" && reward && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 0.6 }} className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <PartyPopper className="h-10 w-10 text-emerald-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-emerald-600">เช็คอินสำเร็จ! 🎉</h2>
            <p className="mt-1 text-sm text-muted-foreground">หักสิทธิ์ร้าน 1 สิทธิ์ · หยุดเวลานับถอยหลังแล้ว</p>
            <div className="mt-4 flex justify-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3">
                <Gift className="h-6 w-6 text-amber-500" />
                <div className="text-left"><p className="text-xs text-muted-foreground">คูปอง</p><p className="font-bold">{reward.discount}</p></div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3">
                <Zap className="h-6 w-6 text-primary" />
                <div className="text-left"><p className="text-xs text-muted-foreground">ได้รับ</p><p className="font-bold text-primary">+{reward.xp} XP</p></div>
              </div>
            </div>
            {reward.drop && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-orange-50 p-4 text-left">
                <span className="text-3xl">{reward.drop.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">วัตถุดิบที่หามาได้</p>
                  <p className="font-bold text-primary">{reward.drop.name} ×1</p>
                </div>
                <Link to="/user/bag" className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">ดูคลัง</Link>
              </div>
            )}
            <Link to={`/user/order/${liveQuest.merchant_id}`} className="mt-5 block w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">สั่งอาหารเลย 🍽️</Link>
            <Link to="/user/bag" className="mt-2 block w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground">ดูคูปองในกระเป๋า</Link>
          </motion.div>
        )}

        {/* Phase 4 — Case 2: full (consolation) */}
        {stage === "full" && reward && (
          <motion.div key="full" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold">ขออภัย สิทธิ์ภารกิจนี้เต็มแล้ว</h2>
            <p className="mt-1 text-sm text-muted-foreground">คุณอุตส่าห์มาถึงหน้าร้านแล้ว เราขอมอบรางวัลปลอบใจแทน 💛</p>
            <div className="mt-4 flex justify-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3">
                <Gift className="h-6 w-6 text-amber-500" />
                <div className="text-left"><p className="text-xs text-muted-foreground">คูปองปลอบใจ</p><p className="font-bold">{reward.discount}</p></div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3">
                <Zap className="h-6 w-6 text-primary" />
                <div className="text-left"><p className="text-xs text-muted-foreground">ได้รับ</p><p className="font-bold text-primary">+{reward.xp} XP</p></div>
              </div>
            </div>
            <Link to="/user" className="mt-5 block w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">หาภารกิจใหม่</Link>
          </motion.div>
        )}

        {/* Phase 4 — Case 3: timeout */}
        {stage === "timeout" && (
          <motion.div key="timeout" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <TimerReset className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-600">หมดเวลาทำภารกิจ</h2>
            <p className="mt-1 text-sm text-muted-foreground">เวลาหมดก่อนเช็คอิน ไม่มีการหักสิทธิ์</p>
            {left > 0 ? (
              <button onClick={() => { setStage("intent"); setRemaining(QUEST_DURATION_SEC); }} className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">รับภารกิจใหม่</button>
            ) : (
              <Link to="/user" className="mt-5 block w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">ดูภารกิจอื่น</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {scanOpen && (
        <ShopQrScanner onClose={() => setScanOpen(false)} onResult={handleScan} />
      )}
    </div>
  );
}