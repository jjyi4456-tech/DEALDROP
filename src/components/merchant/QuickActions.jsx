import { useState } from "react";
import { Link } from "react-router-dom";
import { Utensils, BellRing, Plus, Flame, QrCode } from "lucide-react";
import QuickRescueModal from "@/components/merchant/QuickRescueModal";

const ACTIONS = [
  {
    to: "/merchant/live-qr",
    icon: QrCode,
    plus: false,
    title: "📱 จอ QR เช็คอินหน้าร้าน",
    desc: "เปิดจอ QR ให้ลูกค้าสแกนเช็คอินที่เคาน์เตอร์",
    accent: "bg-blue-600",
  },
  {
    to: "/merchant/menu",
    icon: Utensils,
    plus: true,
    title: "เพิ่ม/แก้ไขเมนูอาหาร",
    desc: "จัดการรายการอาหารและราคาสำหรับสั่งจากโต๊ะ",
    accent: "bg-emerald-500",
  },
  {
    to: "/merchant/orders",
    icon: BellRing,
    plus: false,
    title: "ดูกระดานออเดอร์โต๊ะ",
    desc: "รับออเดอร์และปิดบิลแบบเรียลไทม์",
    accent: "bg-orange-500",
  },
];

export default function QuickActions({ onRescueCreated }) {
  const [rescueOpen, setRescueOpen] = useState(false);

  return (
    <div className="mb-6">
      {/* 🚨 Quick Rescue Deal Spotlight Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setRescueOpen(true)}
          className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 p-0.5 shadow-lg transition-all hover:shadow-xl active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-3 rounded-[22px] bg-white/95 dark:bg-card/95 px-5 py-3.5 backdrop-blur">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-md group-hover:scale-105 transition-transform">
                <Flame className="h-6 w-6 animate-pulse" />
              </span>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold text-foreground">
                    🚨 ปล่อยดีลกู้ชีพด่วน (Quick Rescue Deal)
                  </span>
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600">
                    เคลียร์สต็อก
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ปล่อยเมนูใกล้หมด ลด 50-70% ให้ลูกค้ารีบมารับหน้าร้านใน 30 วินาที
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-3.5 py-2 text-xs font-bold text-white shadow">
              เปิดดีลทันที
            </span>
          </div>
        </button>
      </div>

      <h3 className="mb-3 font-semibold text-sm">ทางลัดด่วน</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${a.accent} text-white`}>
              {a.plus ? <Plus className="h-5 w-5" /> : <a.icon className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <QuickRescueModal
        open={rescueOpen}
        onOpenChange={setRescueOpen}
        onCreated={onRescueCreated}
      />
    </div>
  );
}