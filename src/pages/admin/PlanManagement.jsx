import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import { Check, Pencil, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

export default function PlanManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setPlans(await base44.entities.SubscriptionPlan.list("price", 50)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startEdit = (p) => { setEditId(p.id); setDraft({ ...p, features: p.features ? [...p.features] : [] }); };
  const save = async () => {
    await base44.entities.SubscriptionPlan.update(draft.id, {
      price: Number(draft.price), quest_quota: Number(draft.quest_quota),
      geofence_radius: Number(draft.geofence_radius), push_quota: Number(draft.push_quota),
      banner_days: Number(draft.banner_days), description: draft.description,
      features: draft.features, active: draft.active,
    });
    setEditId(null); setDraft(null);
    toast({ title: "บันทึกแพ็กเกจแล้ว" });
    load();
  };

  const num = (v) => (v === undefined || v === null ? 0 : v);
  const fmt = (p) => p.toLocaleString();

  return (
    <div>
      <PageHeader title="จัดการแพ็กเกจรายเดือน" subtitle="กำหนดราคา สิทธิ์ และโควตาของแต่ละ Tier (Feature Toggling)" />
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">{[1, 2, 3].map((i) => <div key={i} className="h-96 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const editing = editId === p.id;
            const d = editing ? draft : p;
            return (
              <div key={p.id} className="relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm" style={{ borderTop: `4px solid ${p.color}` }}>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-xl font-bold" style={{ color: p.color }}>{p.name}</h3>
                  {editing ? (
                    <div className="flex gap-1">
                      <button onClick={save} className="rounded-lg bg-foreground p-2.5 text-background"><Save className="h-4 w-4" /></button>
                      <button onClick={() => setEditId(null)} className="rounded-lg border p-2.5"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(p)} className="rounded-lg p-2.5 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                  )}
                </div>
                {editing ? (
                  <div className="mb-3 flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">฿</span>
                    <Input type="number" value={d.price} onChange={(e) => setDraft({ ...d, price: e.target.value })} className="w-24 text-2xl font-bold" />
                    <span className="text-sm text-muted-foreground">/เดือน</span>
                  </div>
                ) : (
                  <p className="mb-3 text-3xl font-bold">฿{fmt(p.price)}<span className="text-sm font-normal text-muted-foreground">/เดือน</span></p>
                )}
                <p className="mb-4 text-sm text-muted-foreground">{editing ? (
                  <textarea value={d.description} onChange={(e) => setDraft({ ...d, description: e.target.value })} className="w-full rounded-lg border p-2 text-sm" />
                ) : p.description}</p>

                <div className="space-y-2 text-sm">
                  {[
                    { k: "quest_quota", label: "โควตาภารกิจ", suffix: d.quest_unlimited ? "ไม่จำกัด" : " ครั้ง" },
                    { k: "geofence_radius", label: "รัศมี Geofence", suffix: " เมตร" },
                    { k: "push_quota", label: "LBS Push โควตา", suffix: " ครั้ง" },
                    { k: "banner_days", label: "Banner ฟรี", suffix: " วัน" },
                  ].map((row) => (
                    <div key={row.k} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">{row.label}</span>
                      {editing ? (
                        <Input type="number" value={num(d[row.k])} onChange={(e) => setDraft({ ...d, [row.k]: e.target.value })} className="w-16 text-right" />
                      ) : (
                        <span className="font-semibold">{d.quest_unlimited && row.k === "quest_quota" ? "ไม่จำกัด" : num(d[row.k])}{row.suffix}</span>
                      )}
                    </div>
                  ))}
                  {p.foodie_buddy && <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500" /> Foodie Buddy Integration</div>}
                  {p.data_export && <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500" /> Export ข้อมูล + พยากรณ์</div>}
                  {p.multi_geofence && <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500" /> Multi-Geofence</div>}
                </div>

                {editing && (
                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={d.active} onChange={(e) => setDraft({ ...d, active: e.target.checked })} />
                    เปิดใช้งานแพ็กเกจ (Feature Toggle)
                  </label>
                )}
                {!editing && (
                  <span className={`mt-4 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${p.active ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {p.active ? "เปิดใช้งาน" : "ปิดชั่วคราว"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}