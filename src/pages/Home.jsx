import { Link } from "react-router-dom";
import { Trophy, Store, Coffee, ArrowRight, Sparkles, MapPin, Cat, Wallet } from "lucide-react";

const sides = [
  { key: "admin", path: "/admin", label: "ผู้ดูแลระบบ", desc: "ควบคุมแพลตฟอร์ม อนุมัติร้านค้า จัดการแพ็กเกจ และสถิติภาพรวม", icon: Trophy, color: "from-violet-500 to-indigo-500" },
  { key: "merchant", path: "/merchant", label: "ฝั่งร้านค้า", desc: "สร้างภารกิจ เช็คอิน GPS สแกน QR ตรวจสิทธิ์ และดู CRM Insight", icon: Store, color: "from-emerald-500 to-teal-500" },
  { key: "user", path: "/user", label: "ฝั่งผู้ใช้ (Gen Z)", desc: "หาร้านใกล้ตัว เช็คอินรับ XP เลี้ยงสัตว์ และสะสมคูปอง", icon: Coffee, color: "from-orange-500 to-pink-500" },
];

const features = [
  { icon: MapPin, text: "Geofence Check-in & Anti-Spoofing" },
  { icon: Sparkles, text: "Gamification · XP · Leaderboard · Badges" },
  { icon: Cat, text: "Foodie Buddy สัตว์เลี้ยงเสมือน" },
  { icon: Wallet, text: "กระเป๋าคูปองอัจฉริยะ" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm font-medium shadow-sm">
            <Sparkles className="h-4 w-4 text-amber-500" /> F&B Gamification Platform
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">FoodieQuest</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            แพลตฟอร์มดึงลูกค้าเข้าร้านช่วง Off-peak ด้วยเกมมิฟิเคชัน เชื่อมผู้ดูแล ร้านค้า และผู้ใช้ในที่เดียว
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {sides.map((s) => (
            <Link key={s.key} to={s.path} className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} text-white`}>
                <s.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold">{s.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                เข้าสู่แดชบอร์ด <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {features.map((f) => (
            <div key={f.text} className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <f.icon className="h-4 w-4 text-violet-500" /> {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}