import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import OrderCard from "@/components/merchant/OrderCard";
import { ClipboardList, Bell } from "lucide-react";

const TABS = [
  { key: "pending", label: "ออเดอร์เข้าใหม่", hint: "ยังไม่มีออเดอร์ใหม่ — รอลูกค้าสั่งได้เลย" },
  { key: "preparing", label: "กำลังปรุงอาหาร", hint: "ยังไม่มีออเดอร์ที่กำลังปรุง" },
  { key: "served", label: "รอชำระเงิน/ปิดบิล", hint: "ยังไม่มีบิลรอปิด" },
  { key: "completed", label: "เสร็จสิ้น", hint: "ยังไม่มีออเดอร์ที่ปิดบิลแล้ว" },
];

// Soft two-tone "ding-dong" chime for new orders (no audio file needed)
function playDingDong() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[880, 0], [1174.66, 0.18]].forEach(([freq, t]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + t;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.8);
    });
  } catch { /* audio not available — silent fallback */ }
}

export default function MerchantOrders() {
  const { toast } = useToast();
  const [merchant, setMerchant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [completing, setCompleting] = useState(null);

  const merchantRef = useRef(null);
  const knownIds = useRef(new Set());

  const load = async () => {
    try {
      const me = await base44.auth.me().catch(() => null);
      const list = await base44.entities.Merchant.list();
      const m = (me && list.find((x) => x.created_by_id === me.id)) || list[0] || null;
      merchantRef.current = m;
      setMerchant(m);
      if (m) {
        const os = await base44.entities.Order.filter({ merchant_id: m.id }, "-created_date", 100);
        os.forEach((o) => knownIds.current.add(o.id));
        setOrders(os);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Real-time: refresh on any order change + soft chime for brand-new orders
    const unsub = base44.entities.Order.subscribe((event) => {
      const d = event?.data;
      if (
        event?.type === "create" &&
        d?.status === "pending" &&
        d?.merchant_id === merchantRef.current?.id &&
        !knownIds.current.has(d.id)
      ) {
        playDingDong();
      }
      if (d?.id) knownIds.current.add(d.id);
      load();
    });
    return unsub;
  }, []);

  const onStatus = async (order, status) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    await base44.entities.Order.update(order.id, { status });
  };

  const onComplete = async (order) => {
    setCompleting(order.id);
    try {
      const res = await base44.functions.invoke("completeTableOrder", { order_id: order.id });
      const d = res.data;
      toast({
        title: `ปิดบิล${order.table_no ? ` ${order.table_no}` : ""} สำเร็จ ✅`,
        description: `เก็บเงินลูกค้า ฿${d.net_paid} · หักคอมมิชชัน ฿${d.commission_fee} · เครดิตคงเหลือ ฿${d.balance_after}`,
        className: "border-emerald-500 bg-emerald-500 text-white",
      });
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "ปิดบิลไม่สำเร็จ ลองอีกครั้ง";
      toast({ title: "ปิดบิลไม่สำเร็จ", description: msg, variant: "destructive" });
    } finally {
      setCompleting(null);
    }
  };

  const commissionRate = merchant
    ? merchant.is_pro
      ? 0.03
      : merchant.commission_rate != null
        ? merchant.commission_rate
        : 0.06
    : 0.06;

  const shown = orders.filter((o) => o.status === tab);
  const activeTab = TABS.find((t) => t.key === tab);

  return (
    <div>
      <PageHeader
        title="กระดานออเดอร์ครัว"
        subtitle="ออเดอร์จาก QR โต๊ะ อัปเดต Real-time พร้อมเสียงเตือนเมื่อมีออเดอร์ใหม่"
        action={
          <span className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <Bell className="h-3.5 w-3.5 text-primary" /> เสียงเตือนเปิดอยู่
          </span>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = orders.filter((o) => o.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t.key ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-accent"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${tab === t.key ? "bg-white/20" : "bg-muted"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">{activeTab.hint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatus={onStatus}
              onComplete={onComplete}
              completing={completing}
              commissionRate={commissionRate}
            />
          ))}
        </div>
      )}
    </div>
  );
}