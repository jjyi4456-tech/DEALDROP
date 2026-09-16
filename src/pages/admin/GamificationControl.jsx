import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import { Sparkles, Zap, RotateCcw, Crown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function GamificationControl() {
  const [cfg, setCfg] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [doubleXp, setDoubleXp] = useState(false);
  const [cycle, setCycle] = useState("weekly");
  const { toast } = useToast();

  const load = async () => {
    const list = await base44.entities.GamificationConfig.list();
    if (list[0]) { setCfg(list[0]); setMultiplier(list[0].xp_multiplier); setDoubleXp(list[0].double_xp_active); setCycle(list[0].leaderboard_cycle); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const realMult = doubleXp ? 2 : Number(multiplier);
    await base44.entities.GamificationConfig.update(cfg.id, { xp_multiplier: realMult, double_xp_active: doubleXp, leaderboard_cycle: cycle });
    toast({ title: "บันทึกการตั้งค่าแล้ว", description: `XP x${realMult}${doubleXp ? " (Double XP)" : ""}` });
    load();
  };

  const resetLeaderboard = async () => {
    await base44.entities.GamificationConfig.update(cfg.id, { last_reset_date: new Date().toISOString().slice(0, 10) });
    toast({ title: "รีเซ็ต Leaderboard แล้ว", description: `รอบ: ${cycle === "weekly" ? "รายสัปดาห์" : "รายเดือน"}` });
    load();
  };

  // Mock leaderboard
  const board = [
    { name: "Foodie_King", xp: 4820, badge: "👑" },
    { name: "CafeHunter_99", xp: 4210, badge: "🥈" },
    { name: "NomNom", xp: 3990, badge: "🥉" },
    { name: "AroiMak", xp: 3540 },
    { name: "JingJoYong", xp: 3210 },
  ];

  return (
    <div>
      <PageHeader title="ศูนย์ควบคุมเครื่องยนต์เกม" subtitle="ปรับแต่งค่า XP และจัดการ Leaderboard" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-500" /><h3 className="font-semibold">ปรับค่า XP (Weighting)</h3></div>
          <label className="mb-2 block text-sm font-medium">ตัวคูณ XP</label>
          <div className="flex items-center gap-3">
            <input type="range" min="1" max="5" step="0.5" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} className="w-full" />
            <span className="w-12 text-center text-lg font-bold text-violet-600">x{multiplier}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">ภารกิจที่ให้ XP 50 จะกลายเป็น {50 * (doubleXp ? 2 : multiplier)} XP</p>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-amber-500" />
              <div>
                <p className="font-semibold">โหมด Double XP</p>
                <p className="text-xs text-muted-foreground">คูณสองทุกภารกิจทันที (กระตุ้นช่วงสอบ)</p>
              </div>
            </div>
            <button onClick={() => setDoubleXp(!doubleXp)} className={`relative h-7 w-12 rounded-full transition ${doubleXp ? "bg-amber-500" : "bg-muted"}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${doubleXp ? "left-6" : "left-1"}`} />
            </button>
          </div>

          <button onClick={save} className="mt-5 w-full rounded-xl bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90">บันทึกการตั้งค่า</button>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /><h3 className="font-semibold">Leaderboard</h3></div>
            <Select value={cycle} onValueChange={setCycle}>
              <SelectTrigger className="h-8 w-36 rounded-lg text-sm">
                <SelectValue placeholder="รอบ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                <SelectItem value="monthly">รายเดือน</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {board.map((u, i) => (
              <div key={u.name} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                <span className="w-6 text-center font-bold">{u.badge || i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.name}</p>
                </div>
                <span className="text-sm font-semibold text-violet-600">{u.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
          <button onClick={resetLeaderboard} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium hover:bg-accent">
            <RotateCcw className="h-4 w-4" /> รีเซ็ตอันดับ & แจกฉายาพิเศษ
          </button>
          {cfg && <p className="mt-3 text-center text-xs text-muted-foreground">รีเซ็ตล่าสุด: {cfg.last_reset_date}</p>}
        </div>
      </div>
    </div>
  );
}