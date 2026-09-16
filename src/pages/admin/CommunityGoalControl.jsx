import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Target, Trash2, Loader2, CheckCircle2, Calendar } from "lucide-react";

const REWARD_TYPES = [
  { value: "percent", label: "ลด %" },
  { value: "cash", label: "ลดเงินสด ฿" },
  { value: "menu", label: "แถมเมนู" },
];
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const STATUS_LABEL = { draft: "ฉบับร่าง", active: "กำลังดำเนิน", completed: "สำเร็จแล้ว", expired: "หมดเขตแล้ว" };
const STATUS_COLOR = { draft: "bg-muted text-muted-foreground", active: "bg-emerald-500 text-white", completed: "bg-amber-500 text-white", expired: "bg-red-500 text-white" };
const rewardText = (t, v) => (t === "percent" ? `ลด ${v}%` : t === "cash" ? `ลด ${v}฿` : `แถม ${v}`);

export default function CommunityGoalControl() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "หม้อไฟรวมพลัง นักศึกษา",
    description: "",
    target_count: 100,
    start_date: inDays(0),
    end_date: inDays(30),
    mega_reward_title: "คูปอง Mega ลด 20%",
    mega_reward_type: "percent",
    mega_reward_value: "20",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const load = async () => {
    setGoals(await base44.entities.GlobalGoal.list("-created_date", 50));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setSaving(true);
    try {
      await base44.entities.GlobalGoal.create({
        title: form.title,
        description: form.description,
        target_count: Number(form.target_count) || 100,
        current_count: 0,
        start_date: form.start_date,
        end_date: form.end_date,
        status: "active",
        mega_reward_title: form.mega_reward_title,
        mega_reward_type: form.mega_reward_type,
        mega_reward_value: String(form.mega_reward_value),
      });
      toast({ title: "สร้างแคมเปญหม้อไฟรวมพลังแล้ว", description: `เป้า ${form.target_count} เช็คอิน · ${form.start_date} ถึง ${form.end_date}` });
      load();
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (g, status) => {
    await base44.entities.GlobalGoal.update(g.id, { status });
    toast({ title: `เปลี่ยนสถานะเป็น “${STATUS_LABEL[status]}” แล้ว` });
    load();
  };

  const remove = async (g) => {
    await base44.entities.GlobalGoal.delete(g.id);
    toast({ title: "ลบแคมเปญแล้ว" });
    load();
  };

  return (
    <div>
      <PageHeader title="ภารกิจหม้อไฟรวมพลัง" subtitle="ตั้งค่าเป้าหมาย Global Goal และระยะเวลาแคมเปญเพื่อกระตุ้นชุมชน" />
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Create form */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" /><h3 className="font-semibold">ตั้งค่าแคมเปญใหม่</h3></div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>ชื่อแคมเปญ</Label>
              <Input value={form.title} onChange={set("title")} placeholder="หม้อไฟรวมพลัง นักศึกษา" />
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียด</Label>
              <Textarea value={form.description} onChange={set("description")} rows={2} placeholder="เป้าหมายร่วมกันของชุมชน..." />
            </div>
            <div className="space-y-1.5">
              <Label>เป้าหมาย Check-ins รวม (องศา)</Label>
              <Input type="number" min="1" value={form.target_count} onChange={set("target_count")} />
              <p className="text-xs text-muted-foreground">ทุกเช็คอินในระบบ +1 องศา เมื่อถึงเป้าจะแจก Mega Reward ให้ผู้ร่วมทุกคน</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>วันเริ่มแคมเปญ</Label>
                <Input type="date" value={form.start_date} onChange={set("start_date")} />
              </div>
              <div className="space-y-1.5">
                <Label>วันสิ้นสุดแคมเปญ</Label>
                <Input type="date" value={form.end_date} onChange={set("end_date")} />
              </div>
            </div>
            <div className="rounded-xl bg-orange-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-orange-700"><Target className="h-3.5 w-3.5" /> รางวัล Mega (แจกทุกคนที่มีส่วนร่วม)</p>
              <div className="space-y-2">
                <Input value={form.mega_reward_title} onChange={set("mega_reward_title")} placeholder="ชื่อรางวัล Mega" />
                <div className="flex gap-2">
                  <Select value={form.mega_reward_type} onValueChange={(v) => setForm((f) => ({ ...f, mega_reward_type: v }))}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={form.mega_reward_value} onChange={set("mega_reward_value")} placeholder="ค่ารางวัล" />
                </div>
              </div>
            </div>
            <Button onClick={create} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังสร้าง...</> : <><Flame className="mr-2 h-4 w-4" /> เริ่มแคมเปญ</>}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><Calendar className="h-5 w-5 text-orange-500" /><h3 className="font-semibold">แคมเปญทั้งหมด</h3></div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => {
                const pct = Math.min(100, Math.round(((g.current_count || 0) / (g.target_count || 1)) * 100));
                const done = (g.current_count || 0) >= (g.target_count || 0);
                return (
                  <div key={g.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold leading-tight">{g.title}</p>
                        <p className="text-xs text-muted-foreground">{g.start_date} → {g.end_date}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[g.status] || STATUS_COLOR.draft}`}>{STATUS_LABEL[g.status] || g.status}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-orange-600">{g.current_count || 0}/{g.target_count || 0}°</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">🎁 Mega: {g.mega_reward_title} ({rewardText(g.mega_reward_type, g.mega_reward_value)})</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {g.status === "active" && !done && (
                        <button onClick={() => setStatus(g, "completed")} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"><CheckCircle2 className="h-3 w-3" /> ปิดแคมเปญ</button>
                      )}
                      {g.status !== "active" && (
                        <button onClick={() => setStatus(g, "active")} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent">เปิดใหม่</button>
                      )}
                      <button onClick={() => remove(g)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /> ลบ</button>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีแคมเปญ สร้างแคมเปญแรกได้ทางซ้าย</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}