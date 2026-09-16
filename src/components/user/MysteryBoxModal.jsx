import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const CONFETTI_COLORS = ["#FF7A00", "#FFD700", "#FF4D6D", "#7C3AED", "#22D3EE"];

const ddmm = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// 🎁 Fullscreen surprise box shown to the customer right after the cashier
// closes their bill: น้องมะพร้าว hands over a shaking golden gift box —
// tap it to burst it open (confetti) and reveal the 7-day bounce-back coupon.
export default function MysteryBoxModal({ coupon, onStow }) {
  const [opened, setOpened] = useState(false);
  if (!coupon) return null;

  const openBox = () => {
    setOpened(true);
    confetti({ particleCount: 180, spread: 110, startVelocity: 45, origin: { y: 0.62 }, colors: CONFETTI_COLORS });
    setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: CONFETTI_COLORS }), 250);
    setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: CONFETTI_COLORS }), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-amber-400 via-orange-500 to-rose-500 p-6 text-center text-white">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-extrabold leading-snug drop-shadow-md">
          🎉 ขอบคุณที่แวะมาทานร้าน {coupon.merchant_name}!
        </h2>
        <p className="mt-2 text-sm font-medium text-white/90">น้องมะพร้าวมาส่งของขวัญถึงคุณเอง 🦊</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.div
            key="box"
            className="mt-8 flex flex-col items-center"
            exit={{ scale: 1.6, opacity: 0, rotate: 8 }}
            transition={{ duration: 0.25 }}
          >
            <motion.button
              onClick={openBox}
              whileTap={{ scale: 0.92 }}
              animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
              className="text-[7rem] leading-none drop-shadow-xl"
              aria-label="แตะกล่องเพื่อเปิดรับของขวัญ"
            >
              🦊🎁
            </motion.button>
            <p className="mt-4 animate-pulse rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur">
              แตะที่กล่องเพื่อเปิดรับของขวัญสำหรับมื้อถัดไป 🎁
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            className="mt-8 flex w-full max-w-sm flex-col items-center"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="w-full rounded-3xl bg-white p-6 text-foreground shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-500">Bounce-Back Gift</p>
              <p className="mt-2 text-lg font-extrabold leading-snug">
                🎟️ ส่วนลด {coupon.reward_value}{coupon.reward_type === "percent" ? "%" : "฿"} มื้อถัดไปที่ร้าน {coupon.merchant_name}
              </p>
              <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">
                ⏰ ใช้ได้ภายใน 7 วันเท่านั้น (หมดอายุวันที่ {ddmm(coupon.expires_at)})
              </div>
              <p className="mt-3 text-xs text-muted-foreground">รหัสคูปอง {coupon.qr_code} · เปิดใบคูปองได้ที่กระเป็นเป้</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onStow}
              className="mt-5 w-full max-w-xs rounded-2xl bg-white px-6 py-3.5 text-base font-extrabold text-orange-600 shadow-xl"
            >
              เก็บเข้ากระเป็นเป้
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}