import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { base44 } from "@/api/base44Client";
import { Users, TrendingUp, Repeat, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const hourData = [
  { h: "09", v: 12 }, { h: "10", v: 8 }, { h: "11", v: 15 }, { h: "12", v: 42 },
  { h: "13", v: 38 }, { h: "14", v: 56 }, { h: "15", v: 71 }, { h: "16", v: 64 },
  { h: "17", v: 45 }, { h: "18", v: 88 }, { h: "19", v: 120 }, { h: "20", v: 95 },
];

const seg = [
  { name: "ลูกค้าใหม่", v: 320, color: "#10b981" },
  { name: "ลูกค้ากลับมา", v: 180, color: "#6366f1" },
  { name: "ขาประจำ", v: 95, color: "#f59e0b" },
];

export default function MerchantInsight() {
  const [checkins, setCheckins] = useState([]);
  useEffect(() => { (async () => { setCheckins(await base44.entities.CheckIn.list("-created_date", 50)); })(); }, []);

  return (
    <div>
      <PageHeader title="CRM & Insight" subtitle="สรุปยอดลูกค้า รายได้ช่วงโต๊ะว่าง และข้อมูลขาประจำ"
        action={<button className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent"><Download className="h-4 w-4" /> Export (Premium)</button>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="ลูกค้าจากแอป (เดือนนี้)" value="595" trend={18} icon={Users} />
        <StatCard label="รายได้ Off-peak" value="฿18,400" trend={12} icon={TrendingUp} />
        <StatCard label="ลูกค้ากลับมาซ้ำ" value="180" sub="30% ของทั้งหมด" icon={Repeat} />
        <StatCard label="ขาประจำ" value="95" sub="เช็คอิน 3+ ครั้ง" icon={Users} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">ช่วงเวลาที่เช็คอินหนาแน่นที่สุด</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="h" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">💡 ช่วง 14:00-16:00 น. เป็น Off-peak ที่ภารกิจดึงคนเข้าร้านได้ดีที่สุด</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-4 font-semibold">สัดส่วนลูกค้า</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={seg} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {seg.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="mb-3 font-semibold">ลูกค้าขาประจำ (Top 5)</h3>
        <div className="space-y-2">
          {[
            { name: "Foodie_King", visits: 12, last: "วันนี้" },
            { name: "CafeHunter_99", visits: 9, last: "เมื่อวาน" },
            { name: "NomNom", visits: 8, last: "2 วันที่แล้ว" },
            { name: "AroiMak", visits: 6, last: "3 วันที่แล้ว" },
            { name: "JingJoYong", visits: 5, last: "สัปดาห์ก่อน" },
          ].map((u, i) => (
            <div key={u.name} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">{i + 1}</span>
                <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-muted-foreground">เยี่ยมล่าสุด: {u.last}</p></div>
              </div>
              <span className="text-sm font-semibold text-emerald-600">{u.visits} ครั้ง</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}