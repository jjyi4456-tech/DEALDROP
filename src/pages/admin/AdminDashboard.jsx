import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { TrendingUp, Users, Store, DollarSign, Activity } from "lucide-react";
import CommissionSettingCard from "@/components/admin/CommissionSettingCard";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";

const gmvData = [
  { m: "ม.ค.", gmv: 320 }, { m: "ก.พ.", gmv: 410 }, { m: "ม.ค.", gmv: 580 },
  { m: "เม.ย.", gmv: 690 }, { m: "พ.ค.", gmv: 820 }, { m: "มิ.ย.", gmv: 940 },
  { m: "ก.ค.", gmv: 1180 }, { m: "ส.ค.", gmv: 1340 },
];

const acqData = [
  { wk: "W1", new: 120, ret: 78 }, { wk: "W2", new: 180, ret: 92 },
  { wk: "W3", new: 240, ret: 110 }, { wk: "W4", new: 310, ret: 134 },
  { wk: "W5", new: 420, ret: 168 }, { wk: "W6", new: 560, ret: 210 },
];

// Heatmap intensity 0-100 for check-in density by zone x hour
const zones = ["สยาม", "อารีย์", "ทองหล่อ", "เอกมัย", "ลาดพร้าว", "บางนา", "อ่อนนุช"];
const hours = ["09", "11", "13", "15", "17", "19", "21"];
const heat = zones.map((_, i) => hours.map((_, j) => Math.round(Math.abs(Math.sin(i * 0.7 + j * 0.5)) * 100)));

export default function AdminDashboard() {
  const [hover, setHover] = useState(null);
  return (
    <div>
      <PageHeader title="ภาพรวมแพลตฟอร์ม" subtitle="ตรวจสอบสถานะและสถิติการดำเนินงานทั้งระบบ (13 ส.ค. 2026)" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="GMV (ยอดขายรวม)" value="฿1.34M" trend={13} icon={DollarSign} />
        <StatCard label="ผู้ใช้ใหม่สะสม" value="8,920" trend={22} icon={Users} />
        <StatCard label="ร้านค้ากำลังใช้งาน" value="342" sub="18 ร้านรออนุมัติ" icon={Store} />
        <StatCard label="Retention Rate" value="68%" trend={4} icon={Activity} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CommissionSettingCard />
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Gross Merchandise Value</h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">+13%</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={gmvData}>
              <defs>
                <linearGradient id="gmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="m" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="gmv" stroke="#6366f1" strokeWidth={2} fill="url(#gmv)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">User Acquisition vs Retention</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> ผู้ใช้ใหม่</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> กลับมาใช้</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={acqData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="wk" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="new" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ret" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-1 font-semibold">Heatmap พื้นที่เช็คอินหนาแน่น</h3>
        <p className="mb-4 text-xs text-muted-foreground">วิเคราะห์พฤติกรรมลูกค้าตามโซนและช่วงเวลา</p>
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="mb-1 grid grid-cols-[80px_repeat(7,1fr)] gap-1 text-xs text-muted-foreground">
              <div />
              {hours.map((h) => <div key={h} className="text-center">{h}:00</div>)}
            </div>
            {zones.map((z, i) => (
              <div key={z} className="mb-1 grid grid-cols-[80px_repeat(7,1fr)] gap-1 items-center">
                <div className="text-xs font-medium">{z}</div>
                {heat[i].map((v, j) => (
                  <div
                    key={j}
                    onMouseEnter={() => setHover({ z, v })}
                    onMouseLeave={() => setHover(null)}
                    className="h-9 rounded-md transition-transform hover:scale-105 cursor-pointer"
                    style={{ backgroundColor: `rgba(99,102,241,${0.1 + v / 125})` }}
                  />
                ))}
              </div>
            ))}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              น้อย
              <div className="h-3 w-32 rounded-full bg-gradient-to-r from-indigo-50 to-indigo-500" />
              หนาแน่น
            </div>
          </div>
        </div>
        {hover && <p className="mt-3 text-xs text-muted-foreground">โซน {hover.z} · ความหนาแน่น {hover.v}%</p>}
      </div>
    </div>
  );
}