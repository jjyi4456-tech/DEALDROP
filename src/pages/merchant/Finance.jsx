import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { ReceiptText, Package } from "lucide-react";
import WalletBalanceCard from "@/components/finance/WalletBalanceCard";
import TopupModal from "@/components/finance/TopupModal";
import PlanOverviewCard from "@/components/finance/PlanOverviewCard";
import CommissionOverviewCard from "@/components/finance/CommissionOverviewCard";
import LedgerList from "@/components/finance/LedgerList";
import InvoicesPanel from "@/components/finance/InvoicesPanel";
import PlansPanel from "@/components/finance/PlansPanel";
import PaymentChannelDialog from "@/components/merchant/PaymentChannelDialog";

import { TIER_LABELS } from "@/lib/plansConfig";
const fmtBaht = (n) => `฿${(n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

export default function Finance() {
  const [merchant, setMerchant] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toppingUp, setToppingUp] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [tab, setTab] = useState("ledger");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return;
      const mine = await base44.entities.Merchant.filter({ created_by_id: user.id }, "-created_date", 1);
      const m = mine[0] || null;
      setMerchant(m);
      if (m) {
        const [rows, billingRes] = await Promise.all([
          base44.entities.MerchantLedger.filter({ merchant_id: m.id }, "-created_date", 50).catch(() => []),
          base44.functions.invoke("getMerchantBilling", { merchant_id: m.id }).catch(() => null),
        ]);
        setLedger(rows || []);
        setBilling(billingRes?.data || null);
      }
      const ps = await base44.entities.SubscriptionPlan.filter({ active: true }).catch(() => []);
      setPlans(ps || []);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Stripe checkout return status: wallet top-up / Pro Booster / plan upgrade
  useEffect(() => {
    const topup = searchParams.get("topup");
    const sub = searchParams.get("sub");
    const status = searchParams.get("status");
    if (topup === "success") {
      toast({
        title: "🎉 เติมเครดิตสำเร็จเรียบร้อย!",
        description: "ยอดเงินของคุณอัปเดตแล้ว",
        variant: "success",
      });
      load(true);
      // webhook อาจบันทึกยอดเงินช้ากว่าการกลับมาของหน้า — ดึงข้อมูลซ้ำอีกรอบ
      setTimeout(() => load(true), 3000);
    } else if (topup === "cancel") {
      toast({ title: "ยกเลิกการเติมเงิน", description: "ยังไม่มีการเรียกเก็บเงิน", variant: "destructive" });
    }
    if (sub === "success") {
      toast({
        title: "🎉 สมัคร Pro Booster สำเร็จ!",
        description: "ค่าคอมมิชชันลดเหลือ 3% · เปิดใช้งานอัตโนมัติ",
        variant: "success",
      });
      load(true);
    }
    if (status === "success") {
      toast({
        title: "ชำระเงินสำเร็จ 🎉",
        description: `อัปเกรดเป็น ${TIER_LABELS[searchParams.get("plan")] || "Pro Booster"} แล้ว · สิทธิ์เปิดอัตโนมัติ`,
      });
      load(true);
    } else if (status === "cancelled") {
      toast({ title: "ยกเลิกการชำระเงิน", description: "ยังไม่มีการเรียกเก็บเงิน", variant: "destructive" });
    }
  }, [searchParams]);

  // เติมเครดิตผ่าน Stripe Checkout จริง (PromptPay QR / บัตรเดบิต-เครดิต)
  const topup = async (amt) => {
    if (!merchant || !amt) return;
    if (window.self !== window.top) {
      toast({
        title: "ไม่สามารถชำระในโหมดพรีวิวได้",
        description: "กรุณาเปิดแอปจากลิงก์ที่เผยแพร่แล้วเพื่อชำระเงิน",
        variant: "destructive",
      });
      return;
    }
    setToppingUp(true);
    try {
      const res = await base44.functions.invoke("createCheckout", {
        merchant_id: merchant.id,
        checkout_type: "wallet_topup",
        amount: Number(amt),
        origin: window.location.origin,
      });
      const url = res?.data?.url;
      if (!url) throw new Error(res?.data?.error || "สร้างหน้าชำระเงินไม่สำเร็จ");
      window.location.href = url;
    } catch (e) {
      toast({
        title: "สร้างหน้าชำระเงินไม่สำเร็จ",
        description: String(e?.message || e),
        variant: "destructive",
      });
      setToppingUp(false);
    }
  };

  const upgrade = (plan) => {
    if (window.self !== window.top) {
      toast({
        title: "ไม่สามารถชำระในโหมดพรีวิวได้",
        description: "กรุณาเปิดแอปจากลิงก์ที่เผยแพร่แล้วเพื่อชำระเงิน",
        variant: "destructive",
      });
      return;
    }
    if (!merchant) {
      toast({ title: "ไม่พบข้อมูลร้านค้า", description: "กรุณาสร้างหน้าร้านก่อนอัปเกรด", variant: "destructive" });
      return;
    }
    setCheckoutPlan(plan);
  };

  // Stripe Billing Portal (shared by the Ledger & Plans tabs)
  const openBillingPortal = async () => {
    if (window.self !== window.top) {
      toast({
        title: "เปิดในแอปจริง",
        description: "การจัดการการชำระเงินต้องเปิดจากแอปที่เผยแพร่แล้ว",
        variant: "destructive",
      });
      return;
    }
    if (!merchant) return;
    setPortalLoading(true);
    try {
      const returnUrl = `${window.location.origin}/merchant/finance`;
      const res = await base44.functions.invoke("createBillingPortal", { merchant_id: merchant.id, return_url: returnUrl });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast({ title: res.data?.reason || res.data?.error || "ยังเปิดไม่ได้", variant: "destructive" });
      }
    } catch (e) {
      const reason = e?.response?.data?.reason || e?.response?.data?.error;
      toast({ title: reason || "เปิดหน้าจัดการไม่สำเร็จ", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="ศูนย์การเงินร้านค้า"
        subtitle="เครดิต · แพ็กเกจ · ค่าคอมมิชชัน และประวัติการเงิน — รวมไว้ในหน้าเดียว"
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* Overview metric cards */}
          <div className="grid gap-4 lg:grid-cols-3">
            <WalletBalanceCard wallet={merchant?.wallet_balance ?? 100} onOpenTopup={() => setTopupOpen(true)} />
            <PlanOverviewCard merchant={merchant} plans={plans} onManagePlan={() => setTab("plans")} />
            <CommissionOverviewCard merchant={merchant} plans={plans} onUpgrade={upgrade} />
          </div>

          {/* Dual tabs: Ledger & History | Subscription Plans */}
          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList>
              <TabsTrigger value="ledger">
                <ReceiptText className="mr-1.5 h-4 w-4" /> ประวัติการเงิน & ใบเสร็จ
              </TabsTrigger>
              <TabsTrigger value="plans">
                <Package className="mr-1.5 h-4 w-4" /> แพ็กเกจและสิทธิประโยชน์
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ledger" className="mt-4">
              <div className="space-y-4">
                <LedgerList rows={ledger} />
                <InvoicesPanel
                  billing={billing}
                  loading={loading}
                  onOpenPortal={openBillingPortal}
                  portalLoading={portalLoading}
                />
              </div>
            </TabsContent>
            <TabsContent value="plans" className="mt-4">
              <PlansPanel
                merchant={merchant}
                plans={plans}
                loading={loading}
                billing={billing}
                onUpgrade={upgrade}
                onOpenPortal={openBillingPortal}
                portalLoading={portalLoading}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <TopupModal open={topupOpen} toppingUp={toppingUp} onConfirm={topup} onClose={() => setTopupOpen(false)} />
      <PaymentChannelDialog open={!!checkoutPlan} plan={checkoutPlan} merchant={merchant} onClose={() => setCheckoutPlan(null)} />
    </div>
  );
}