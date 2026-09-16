import { Link } from "react-router-dom";
import { Utensils, BellRing, Plus } from "lucide-react";

const ACTIONS = [
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

export default function QuickActions() {
  return (
    <div className="mb-6">
      <h3 className="mb-3 font-semibold">ทางลัดด่วน</h3>
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
    </div>
  );
}