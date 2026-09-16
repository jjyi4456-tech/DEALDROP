import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Search, Save, Percent } from "lucide-react";
import { formatTHB } from "@/lib/money";

const PAYMENT_TERMS = [
  { value: "monthly_invoice", label: "ออกใบแจ้งหนี้รายเดือน" },
  { value: "deduct_from_balance", label: "หักจากยอด Wallet คงเหลือ" },
  { value: "direct_split", label: "แบ่งจ่ายผ่าน Gateway ทันที" },
];

// Per-merchant commission control: take-rate %, billing model and
// accumulated GMV / commission history for every approved shop.
export default function MerchantCommissionControl() {
  const [merchants, setMerchants] = useState(null);
  const [configs, setConfigs] = useState(null);
  const [defaultRate, setDefaultRate] = useState(5);
  const [txStats, setTxStats] = useState({});
  const [rows, setRows] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [m, c, platform, txs] = await Promise.all([
          base44.entities.Merchant.filter({ status: "approved" }, "name", 100),
          base44.entities.MerchantBillingConfig.list("-created_date", 100),
          base44.entities.PlatformConfig.list(),
          base44.entities.Transaction.list("-created_date", 500),
        ]);
        setMerchants(m);
        setConfigs(c);
        // Respect an explicit 0% (commission disabled); only fall back to 5%
        // when the platform config record doesn't exist at all.
        const dr = platform[0]?.commission_percent;
        setDefaultRate(typeof dr === "number" ? dr : 5);
        // Accumulated GMV + commission per merchant (verified/settled only).
        const stats = {};
        for (const t of txs) {
          if (!t.merchant_id || !["verified", "settled"].includes(t.status)) continue;
          if (!stats[t.merchant_id]) stats[t.merchant_id] = { gmv: 0, commission: 0, bills: 0 };
          stats[t.merchant_id].gmv += t.gross_amount || 0;
          stats[t.merchant_id].commission += t.platform_fee || 0;
          stats[t.merchant_id].bills += 1;
        }
        setTxStats(stats);

        // Local editable row state per merchant.
        const fallbackRate = typeof dr === "number" ? dr : 5;
        const next = {};
        for (const merchant of m) {
          const cfg = c.find((x) => x.merchant_id === merchant.id);
          next[merchant.id] = {
            cfgId: cfg?.id || null,
            rate: cfg ? String(cfg.default_commission_rate ?? "") : String(fallbackRate),
            terms: cfg?.payment_terms || "monthly_invoice",
            active: cfg ? Boolean(cfg.is_commission_active) : true,
          };
        }
        setRows(next);
      } catch {
        toast({ title: "โหลดข้อมูลร้านค้าไม่สำเร็จ", variant: "destructive" });
      }
    })();
  }, [toast]);

  const filtered = useMemo(() => {
    const list = merchants || [];
    const q = search.trim().toLowerCase();
    return q ? list.filter((m) => (m.name || "").toLowerCase().includes(q)) : list;
  }, [merchants, search]);

  const setRow = (id, patch) => setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const save = async (m) => {
    const row = rows[m.id];
    const rate = Number(row.rate);
    if (row.rate === "" || Number.isNaN(rate) || rate < 0 || rate > 100) {
      toast({ title: "กรุณากรอก % คอมมิชชั่นระหว่าง 0-100", variant: "destructive" });
      return;
    }
    setSavingId(m.id);
    try {
      const payload = {
        merchant_id: m.id,
        merchant_name: m.name,
        merchant_owner_id: m.created_by_id,
        default_commission_rate: rate,
        payment_terms: row.terms,
        is_commission_active: row.active,
      };
      let saved;
      if (row.cfgId) {
        saved = await base44.entities.MerchantBillingConfig.update(row.cfgId, payload);
      } else {
        saved = await base44.entities.MerchantBillingConfig.create(payload);
        setRow(m.id, { cfgId: saved.id });
        setConfigs((prev) => [...(prev || []), { id: saved.id, ...payload }]);
      }
      toast({ title: `บันทึกคอมมิชชั่น “${m.name}” = ${rate}% เรียบร้อย` });
    } catch {
      toast({ title: "บันทึกไม่สำเร็จ ลองอีกครั้ง", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="ส่วนแบ่งร้านค้า (Commission)"
        subtitle={`แก้ไข Take-rate รายร้านและโมเดลการเก็บเงิน — ร้านที่ไม่ได้ตั้งค่าจะใช้อัตราเริ่มต้น ${defaultRate}%`}
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อร้านค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {merchants === null || configs === null ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border text-sm text-muted-foreground">
          ไม่พบร้านค้าที่อนุมัติแล้ว
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const row = rows[m.id] || { rate: "", terms: "monthly_invoice", active: true };
            const stats = txStats[m.id] || { gmv: 0, commission: 0, bills: 0 };
            return (
              <div key={m.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  {/* Shop identity */}
                  <div className="min-w-[160px] flex-1">
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.category} · บิล {stats.bills} ใบ · GMV {formatTHB(stats.gmv)}
                    </p>
                  </div>

                  {/* Take-rate % */}
                  <div className="flex items-center gap-1.5">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={row.rate}
                      onChange={(e) => setRow(m.id, { rate: e.target.value })}
                      className="h-9 w-20 text-center"
                    />
                  </div>

                  {/* Billing model */}
                  <Select value={row.terms} onValueChange={(v) => setRow(m.id, { terms: v })}>
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Commission on/off */}
                  <button
                    onClick={() => setRow(m.id, { active: !row.active })}
                    className={`h-9 rounded-full px-4 text-xs font-semibold transition-colors ${
                      row.active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.active ? "เก็บคอมมิชชั่น" : "ยกเว้น"}
                  </button>

                  <Button size="sm" disabled={savingId === m.id} onClick={() => save(m)}>
                    <Save className="h-4 w-4" />
                    {savingId === m.id ? "บันทึก..." : "บันทึก"}
                  </Button>
                </div>

                {/* Accumulated history */}
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 text-xs">
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    คอมมิชชั่นสะสม: <b className="text-primary">{formatTHB(stats.commission, 2)}</b>
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    ยอดร้านรับสุทธิ: <b>{formatTHB(stats.gmv - stats.commission, 2)}</b>
                  </span>
                  {!row.cfgId && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                      ยังไม่มีค่าที่ตั้งไว้ (ใช้อัตราเริ่มต้น)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}