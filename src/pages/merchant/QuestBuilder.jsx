import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import { Target, Plus, Trash2, Clock, Users, Gift, Check, ChevronLeft, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { bkDate } from "@/lib/questTime";

const REWARD_TYPES = [
  { value: "percent", label: "ลด %", hint: "เช่น 20" },
  { value: "cash", label: "ลดเงินสด", hint: "เช่น 50 บาท" },
  { value: "menu", label: "แถมเมนู", hint: "เช่น แถมน้ำฟรี" },
];

const TODAY = bkDate(); // Bangkok date, matches the discovery time-window filter
const TIME_FENCES = [
  { label: "ช่วงเช้า 09:00-11:00", start: "09:00", end: "11:00" },
  { label: "ช่วงบ่าย 14:00-16:00", start: "14:00", end: "16:00" },
  { label: "ช่วงเย็น 15:00-17:00", start: "15:00", end: "17:00" },
];

const STEPS = ["เลือกรางวัล", "ตั้งเวลา & จำนวน", "ตั้งชื่อ & สร้าง"];

export default function QuestBuilder() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: "", reward_type: "percent", reward_value: "", start_time: "14:00", end_time: "16:00", capacity: 10, xp_reward: 50, quest_date: TODAY, squad_size: 0 });
  const { toast } = useToast();

  const [myMerchant, setMyMerchant] = useState(null);
  const load = async () => {
    setLoading(true);
    try {
      const [qs, me] = await Promise.all([
        base44.entities.Quest.list("-quest_date", 50),
        base44.auth.me().catch(() => null),
      ]);
      setQuests(qs);
      if (me) {
        const mine = await base44.entities.Merchant.filter({ created_by_id: me.id }, "-created_date", 1);
        setMyMerchant(mine[0] || null);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const next = () => {
    if (step === 1 && !form.reward_value) { toast({ title: "กรุณากรอกค่ารางวัล", variant: "destructive" }); return; }
    if (step === 2 && form.end_time <= form.start_time) { toast({ title: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม", variant: "destructive" }); return; }
    setStep((s) => Math.min(3, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    if (!form.title) { toast({ title: "กรุณาตั้งชื่อภารกิจ", variant: "destructive" }); return; }
    await base44.entities.Quest.create({
      merchant_id: myMerchant?.id || "m_grow1", merchant_name: myMerchant?.name || "ร้านก๋วยเตี๋ยวเจ้าดัง",
      title: form.title,
      reward_type: form.reward_type, reward_value: form.reward_value,
      start_time: form.start_time, end_time: form.end_time, quest_date: form.quest_date,
      capacity: Number(form.capacity), participants: 0, status: "active",
      xp_reward: Number(form.xp_reward),
      squad_size: Number(form.squad_size) || 0,
    });
    setShowForm(false);
    setStep(1);
    setForm({ title: "", reward_type: "percent", reward_value: "", start_time: "14:00", end_time: "16:00", capacity: 10, xp_reward: 50, quest_date: TODAY, squad_size: 0 });
    toast({ title: "สร้างภารกิจแล้ว 🎯" });
    load();
  };

  const remove = async (id) => { await base44.entities.Quest.delete(id); load(); };

  return (
    <div>
      <PageHeader title="เครื่องมือสร้างภารกิจ" subtitle="วิซาร์ด 3 ขั้นตอน · สร้างภารกิจ Off-peak ได้ใน 3 คลิก"
        action={<button onClick={() => { setShowForm((v) => !v); setStep(1); }} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">{showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showForm ? "ปิด" : "สร้างภารกิจ"}</button>} />

      {showForm && (
        <div className="mb-6 rounded-2xl border bg-card p-6">
          <div className="mb-6 flex items-center gap-2">
            {STEPS.map((label, idx) => {
              const n = idx + 1;
              return (
                <div key={label} className="flex-1">
                  <div className={`h-1.5 rounded-full transition ${n <= step ? "bg-primary" : "bg-muted"}`} />
                  <p className={`mt-1.5 text-xs ${n === step ? "font-bold text-primary" : "text-muted-foreground"}`}>{n}. {label}</p>
                </div>
              );
            })}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">ประเภทรางวัล</label>
                <Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v })}>
                  <SelectTrigger className="h-12 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REWARD_TYPES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> {r.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">ค่ารางวัล <span className="text-muted-foreground">({REWARD_TYPES.find((r) => r.value === form.reward_type)?.hint})</span></label>
                <Input value={form.reward_value} onChange={(e) => setForm({ ...form, reward_value: e.target.value })} placeholder="เช่น 20 / 50 / แถมน้ำฟรี" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">วันที่ของภารกิจ</label>
                <Input type="date" value={form.quest_date} onChange={(e) => setForm({ ...form, quest_date: e.target.value })} className="w-full sm:w-56" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">เวลาเริ่ม - สิ้นสุด <span className="text-muted-foreground">(กำหนดเองได้อิสระ)</span></label>
                <div className="flex items-center gap-3">
                  <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-32" />
                  <span className="text-muted-foreground">ถึง</span>
                  <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-32" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">หรือเลือกช่วงเวลาด่วน</label>
                <div className="flex flex-wrap gap-2">
                  {TIME_FENCES.map((f) => {
                    const active = form.start_time === f.start && form.end_time === f.end;
                    return (
                      <button key={f.label} onClick={() => setForm({ ...form, start_time: f.start, end_time: f.end })} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}>
                        <Clock className="mr-1 inline h-3 w-3" />{f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1 text-sm font-medium"><Users className="h-4 w-4" /> จำนวนสิทธิ์ (Capacity)</label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-32" />
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <label className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-1"><Gift className="h-4 w-4 text-primary" /> เปิด Squad กินแหลก (ปาร์ตี้)</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, squad_size: form.squad_size > 0 ? 0 : 4 })}
                    className={`relative h-6 w-11 rounded-full transition ${form.squad_size > 0 ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${form.squad_size > 0 ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </label>
                {form.squad_size > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    ชวนเพื่อน
                    <Input type="number" min="2" max="10" value={form.squad_size} onChange={(e) => setForm({ ...form, squad_size: e.target.value })} className="w-20" />
                    คน · ครบหมู่เช็คอินที่ร้านแล้วแจกรางวัลใหญ่ + XP x3
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">ชื่อภารกิจ</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="เช่น มื้อเที่ยงสบาย ลด 20%" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">XP ที่ผู้ใช้จะได้รับ</label>
                <Input type="number" value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: e.target.value })} className="w-32" />
              </div>
              <div className="rounded-xl bg-primary/5 p-4 text-sm">
                <p className="font-semibold">สรุปภารกิจ</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>รางวัล: {REWARD_TYPES.find((r) => r.value === form.reward_type)?.label} {form.reward_value}</li>
                  <li>เวลา: {form.start_time}-{form.end_time} · {form.quest_date}</li>
                  <li>จำกัด: {form.capacity} สิทธิ์ · ให้ {form.xp_reward} XP</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            {step > 1 && (
              <button onClick={back} className="flex items-center gap-1 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-accent"><ChevronLeft className="h-4 w-4" /> ย้อนกลับ</button>
            )}
            {step < 3 && (
              <button onClick={next} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">ถัดไป</button>
            )}
            {step === 3 && (
              <button onClick={submit} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Check className="h-4 w-4" /> สร้างภารกิจ</button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((q) => {
            const left = q.capacity - (q.participants || 0);
            return (
              <div key={q.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></div>
                  <button onClick={() => remove(q.id)} className="rounded-lg p-2.5 text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <h3 className="mt-2 font-semibold leading-tight">{q.title}</h3>
                <p className="text-xs text-muted-foreground">{q.start_time}-{q.end_time} · {q.quest_date}</p>
                {q.squad_size > 0 && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"><Users className="h-3 w-3" /> Squad {q.squad_size} คน</span>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{q.reward_type === "percent" ? "ลด %" : q.reward_type === "cash" ? "ลดเงินสด" : "แถม"} {q.reward_value}</span>
                  <span className={`text-xs font-semibold ${left <= 2 ? "text-red-500" : "text-emerald-600"}`}>เหลือ {left} สิทธิ์</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${((q.participants || 0) / q.capacity) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}