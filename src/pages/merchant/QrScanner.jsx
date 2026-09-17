import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { ScanLine, CheckCircle2, XCircle, Loader2, Wallet as WalletIcon, Sparkles, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";

const fmtBaht = (n) => `฿${(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const pct = (r) => `${Math.round((r ?? 0) * 10000) / 100}%`;

export default function QrScanner() {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [coupon, setCoupon] = useState(null); // validated coupon awaiting the bill
  const [rejectInfo, setRejectInfo] = useState(null);
  const [receipt, setReceipt] = useState(null); // success summary
  const [bill, setBill] = useState("");
  const [merchant, setMerchant] = useState(null);
  const [plan, setPlan] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [storyShared, setStoryShared] = useState(false); // 📸 cashier confirmed the customer showed a story
  const { toast } = useToast();

  // My merchant + active Pro plan (drives the commission preview)
  useEffect(() => {
    (async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return;
      const mine = await base44.entities.Merchant.filter({ created_by_id: user.id }, "-created_date", 1);
      const m = mine[0] || null;
      setMerchant(m);
      if (m?.active_plan_id) {
        const p = await base44.entities.SubscriptionPlan.get(m.active_plan_id).catch(() => null);
        const subActive = !m.subscription_expires_at || new Date(m.subscription_expires_at) > new Date();
        if (p && subActive) setPlan(p);
      }
    })();
  }, []);

  const rate = merchant?.is_pro ? 0.03 : plan?.discounted_commission_rate ?? merchant?.commission_rate ?? 0.06;
  const wallet = merchant?.wallet_balance ?? 100;
  const walletBlocked = wallet < 0;

  // Real-time bill breakdown
  const preview = (() => {
    const billAmount = Number(bill) || 0;
    if (!billAmount || !coupon) return null;
    let discount = 0;
    const rv = Number(coupon.reward_value) || 0;
    if (coupon.reward_type === "percent") discount = (billAmount * rv) / 100;
    else if (coupon.reward_type === "cash") discount = Math.min(rv, billAmount);
    discount = Math.round(discount * 100) / 100;
    // 📸 Story Boost: extra discount when the cashier confirms a story share
    const boostPct = merchant?.story_boost_enabled ? merchant.story_boost_percent ?? 5 : 0;
    const storyBonus = storyShared && boostPct > 0 ? Math.round((billAmount * boostPct) / 100 * 100) / 100 : 0;
    const finalPaid = Math.max(0, Math.round((billAmount - discount - storyBonus) * 100) / 100);
    const fee = Math.round(finalPaid * rate * 100) / 100;
    return { discount, storyBonus, finalPaid, fee, balanceAfter: Math.round((wallet - fee) * 100) / 100, grace: wallet < fee };
  })();

  const resetScan = () => {
    setReceipt(null);
    setCoupon(null);
    setCode("");
    setBill("");
    setCustomerName(null);
    setStoryShared(false);
    setRejectInfo(null);
  };

  const verify = async () => {
    if (!code.trim() || !merchant) return;
    setChecking(true);
    setCoupon(null);
    setRejectInfo(null);
    setReceipt(null);
    setBill("");
    try {
      const coupons = await base44.entities.Coupon.filter({ qr_code: code.trim() }, null, 1);
      if (!coupons.length) { setRejectInfo("ไม่พบคูปองนี้ในระบบ"); return; }
      const c = coupons[0];
      setCustomerName(null);
      if (c.merchant_id && c.merchant_id !== merchant.id) { setRejectInfo("คูปองนี้ไม่ใช่ของร้านคุณ"); return; }
      if (c.status === "used") { setRejectInfo("คูปองนี้ถูกใช้งานแล้ว (ป้องกันการใช้ซ้ำ)"); return; }
      const today = new Date().toISOString().slice(0, 10);
      if (c.status === "expired" || (c.expiry_date && c.expiry_date < today)) { setRejectInfo("คูปองหมดอายุแล้ว"); return; }
      setCoupon(c);
      if (c.user_id) {
        const u = await base44.entities.User.get(c.user_id).catch(() => null);
        setCustomerName(u?.full_name || null);
      }
    } finally {
      setChecking(false);
    }
  };

  const confirmRescueRedeem = async () => {
    if (!coupon || coupon.coupon_type !== "rescue_deal") return;
    setProcessing(true);
    try {
      // 1. Mark coupon as used
      const todayIso = new Date().toISOString().slice(0, 10);
      await base44.entities.Coupon.update(coupon.id, {
        status: "used",
        redeemed_date: todayIso,
      });

      // 2. Award Eco-XP x2 (+100 XP) to user
      if (coupon.user_id) {
        const targetUser = await base44.entities.User.get(coupon.user_id).catch(() => null);
        if (targetUser) {
          await base44.entities.User.update(coupon.user_id, {
            xp: (Number(targetUser.xp) || 0) + 100,
            total_checkins: (Number(targetUser.total_checkins) || 0) + 1,
          });
        }
      }

      setReceipt({
        rescue_deal: true,
        item_title: coupon.title,
        customer: customerName || "สมาชิกกู้โลก",
        date: todayIso,
      });
      setCoupon(null);
      toast({
        title: "🌿 สแกนส่งมอบเมนูกู้ชีพสำเร็จ!",
        description: `ลูกค้าได้รับ Eco-XP x2 (+100 XP) และตัดสิทธิ์ในระบบเรียบร้อยแล้ว`,
      });
    } catch (e) {
      toast({ title: "เกิดข้อผิดพลาด", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const confirmRedeem = async () => {
    const billAmount = Number(bill);
    if (!coupon || !Number.isFinite(billAmount) || billAmount <= 0) return;
    setProcessing(true);
    try {
      const res = await base44.functions.invoke("redeemCouponWithBill", {
        coupon_code: coupon.qr_code,
        bill_amount: billAmount,
        merchant_id: merchant.id,
        story_shared: storyShared,
      });
      const d = res?.data || res;
      setReceipt(d);
      setCoupon(null);
      setBill("");
      setStoryShared(false);
      toast({
        title: "ตัดบิลสำเร็จ ✓",
        description: `ค่าคอมมิชชัน ${fmtBaht(d.commission_fee)} ถูกหักจากกระเป๋าเงินแล้ว`,
      });
      const fresh = await base44.entities.Merchant.get(merchant.id);
      setMerchant(fresh);
    } catch (e) {
      const payload = e?.response?.data || e?.data || {};
      const title =
        payload.error === "COUPON_ALREADY_USED" ? "คูปองถูกใช้ไปแล้ว" :
        payload.error === "WALLET_EXHAUSTED" ? "กระเป๋าเงินติดลบ" :
        payload.error === "COUPON_EXPIRED" ? "คูปองหมดอายุ" :
        "ทำรายการไม่สำเร็จ";
      toast({
        title,
        description: payload.error === "WALLET_EXHAUSTED" ? "กรุณาเติมเครดิตก่อนรับคูปองถัดไป" : (payload.message || payload.error || ""),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <PageHeader title="สแกน QR / ตรวจสิทธิ์" subtitle="สแกนคูปองลูกค้า กรอกยอดบิลจริง แล้วระบบจะตัดค่าคอมมิชชันจากกระเป๋าเงินอัตโนมัติ" />

      <div className="mx-auto max-w-md">
        {/* Wallet status chip */}
        {merchant && (
          <Link to="/merchant/finance" className="mb-4 flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${walletBlocked ? "bg-red-50" : "bg-emerald-50"}`}>
                <WalletIcon className={`h-5 w-5 ${walletBlocked ? "text-red-500" : "text-emerald-500"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">เครดิตคงเหลือ (คอมมิชชัน {pct(rate)}{plan ? " · Pro" : ""})</p>
                <p className={`text-lg font-bold ${walletBlocked ? "text-red-600" : ""}`}>{fmtBaht(wallet)}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary hover:underline">เติมเครดิต →</span>
          </Link>
        )}

        {/* Scan / code entry */}
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-3xl border-2 border-dashed border-emerald-300 bg-emerald-50/50">
            <ScanLine className="h-16 w-16 text-emerald-500" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">วางกล้องให้ตรง QR Code ของลูกค้า หรือกรอกรหัสด้านล่าง</p>

          <div className="mt-5 flex gap-2">
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value); setCoupon(null); setRejectInfo(null); setReceipt(null); }}
              placeholder="CPN-XXXXX"
              className="flex-1 text-center font-mono uppercase"
            />
            <button
              onClick={verify}
              disabled={checking || !code.trim() || !merchant}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {checking ? "กำลังตรวจ..." : "ตรวจสิทธิ์"}
            </button>
          </div>
        </div>

        {/* Reject */}
        {rejectInfo && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <XCircle className="h-7 w-7 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-700">ไม่สามารถใช้สิทธิ์ได้</p>
              <p className="text-sm text-muted-foreground">{rejectInfo}</p>
            </div>
          </div>
        )}

        {/* Step 2: bill entry or direct rescue deal redemption */}
        {coupon && (
          <div className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
            {coupon.coupon_type === "rescue_deal" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600 font-extrabold text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    🚨
                  </span>
                  ดีลกู้ชีพอาหารเคลียร์สต็อก (Rescue Deal)
                </div>
                <div className="rounded-2xl border bg-muted/40 p-4 space-y-2 text-left">
                  <p className="font-extrabold text-foreground text-base">{coupon.title}</p>
                  <p className="text-xs text-muted-foreground">
                    ลูกค้า: <span className="font-bold text-foreground">{customerName || "สมาชิกกู้โลก"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    รหัสจอง: <span className="font-mono font-bold text-foreground">{coupon.qr_code}</span>
                  </p>
                  <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-emerald-700 font-bold">
                    <span>🌱 รางวัลภารกิจ:</span>
                    <span>Eco-XP x2 (+100 XP)</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  ตรวจสอบสินค้าและส่งมอบอาหารให้ลูกค้า จากนั้นกดยืนยันส่งมอบเพื่อตัดสิทธิ์และมอบ Eco-XP x2
                </p>

                <button
                  type="button"
                  onClick={confirmRescueRedeem}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 py-4 text-base font-extrabold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  {processing ? "กำลังส่งมอบ..." : "ยืนยันส่งมอบเมนูกู้ชีพ"}
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold">คูปอง: {coupon.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ลูกค้า: {customerName || "สมาชิก DEALDROP"} · ส่วนลด{" "}
                  {coupon.reward_type === "percent" ? `${coupon.reward_value}%` : coupon.reward_type === "cash" ? `${fmtBaht(Number(coupon.reward_value))}` : `แถม ${coupon.reward_value}`}
                </p>

                <label className="mt-4 block text-xs font-medium text-muted-foreground">ยอดบิลรวมทั้งหมด (฿)</label>
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={bill}
                  onChange={(e) => setBill(e.target.value)}
                  placeholder="เช่น 450"
                  className="mt-1 h-14 text-center text-2xl font-bold"
                />

            {/* 📸 Story Boost: cashier ticks when the customer shows a story tagging the shop */}
            {merchant?.story_boost_enabled && (
              <button
                type="button"
                onClick={() => setStoryShared((v) => !v)}
                className={`mt-3 flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition ${
                  storyShared
                    ? "border-fuchsia-500 bg-fuchsia-50"
                    : "border-dashed border-fuchsia-200 hover:border-fuchsia-400"
                }`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${storyShared ? "border-fuchsia-500 bg-fuchsia-500 text-white" : "border-muted-foreground/40"}`}>
                  {storyShared && <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
                <span className="text-sm font-medium leading-snug">
                  📸 ลูกค้าแสดง IG/TikTok Story ที่แท็กร้านแล้ว{" "}
                  <span className="font-bold text-fuchsia-600">(+ลดเพิ่ม {merchant.story_boost_percent ?? 5}%)</span>
                </span>
              </button>
            )}

            {preview && (
              <div className="mt-4 space-y-1.5 rounded-xl bg-muted/60 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">ยอดบิลเดิม</span><span>{fmtBaht(Number(bill))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ส่วนลดคูปอง</span><span className="text-emerald-600">-{fmtBaht(preview.discount)}</span></div>
                {preview.storyBonus > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">📸 โบนัสแชร์สตอรี่ (+{merchant?.story_boost_percent ?? 5}%)</span><span className="font-semibold text-fuchsia-600">-{fmtBaht(preview.storyBonus)}</span></div>
                )}
                <div className="flex items-center justify-between border-t pt-1.5 font-bold">
                  <span>ยอดสุทธิที่เรียกเก็บจากลูกค้า</span>
                  <span className="text-lg">{fmtBaht(preview.finalPaid)}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">ค่าคอมมิชชันแพลตฟอร์ม ({pct(rate)})</span><span className="text-primary">-{fmtBaht(preview.fee)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">เครดิตคงเหลือหลังหัก</span><span className={preview.balanceAfter < 0 ? "font-bold text-red-600" : "font-semibold"}>{fmtBaht(preview.balanceAfter)}</span></div>
              </div>
            )}

            {preview?.grace && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <p>เครดิตไม่พอหักค่าคอมมิชชัน — ระบบอนุญาตเป็น Grace Period ได้ 1 ครั้ง (ยอดจะติดลบชั่วคราว) กรุณาเติมเงินหลังทำรายการนี้</p>
              </div>
            )}
            {walletBlocked && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <p>กระเป๋าเงินติดลบ (ใช้ Grace ไปแล้ว) — ต้องเติมเครดิตก่อนจึงจะรับคูปองได้</p>
              </div>
            )}

            <button
              onClick={confirmRedeem}
              disabled={processing || !preview || walletBlocked}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {processing ? "กำลังตัดบิล..." : "ยืนยันปิดบิลและใช้สิทธิ์"}
            </button>
            </>
          )}
          </div>
        )}

        {/* Success modal */}
        <Dialog open={!!receipt} onOpenChange={(o) => { if (!o) resetScan(); }}>
          <DialogContent className="max-w-sm rounded-2xl border-emerald-200 bg-emerald-50">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="mt-2 text-xl font-bold text-emerald-700">
                {receipt?.rescue_deal ? "ส่งมอบเมนูกู้ชีพสำเร็จ ✓" : "ปิดบิลสำเร็จ ✓"}
              </p>

              {receipt?.rescue_deal ? (
                <div className="mt-4 w-full space-y-2 rounded-xl bg-white/90 p-4 text-left text-sm border border-emerald-200">
                  <div className="flex justify-between"><span className="text-muted-foreground">เมนู</span><span className="font-extrabold text-foreground">{receipt.item_title}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ผู้รับ</span><span className="font-bold">{receipt.customer}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">วันที่</span><span>{receipt.date}</span></div>
                  <div className="flex justify-between border-t pt-1.5 text-emerald-700 font-black">
                    <span>🌱 คะแนนโบนัสที่มอบ</span>
                    <span>Eco-XP x2 (+100 XP)</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 w-full space-y-1.5 rounded-xl bg-white/80 p-4 text-left text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">ยอดบิล</span><span>{fmtBaht(receipt?.bill_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ส่วนลดคูปอง</span><span className="text-emerald-600">-{fmtBaht(receipt?.discount_amount)}</span></div>
                  {receipt?.story_bonus > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">📸 โบนัสแชร์สตอรี่</span><span className="text-fuchsia-600">-{fmtBaht(receipt?.story_bonus)}</span></div>
                  )}
                  <div className="flex justify-between font-bold"><span>ยอดสุทธิที่เรียกเก็บ</span><span>{fmtBaht(receipt?.final_paid_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ค่าคอมมิชชันที่หัก ({pct(receipt?.commission_rate)}{receipt?.pro_applied ? " · Pro" : ""})</span><span className="text-primary">-{fmtBaht(receipt?.commission_fee)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">เครดิตคงเหลือ</span><span className="font-semibold">{fmtBaht(receipt?.balance_after)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ลูกค้าได้รับ</span><span className="font-semibold text-primary">+{receipt?.xp} XP{receipt?.drop ? ` · ${receipt.drop.emoji} ${receipt.drop.name}` : ""}</span></div>
                </div>
              )}
              {receipt?.grace_used && (
                <p className="mt-3 rounded-xl bg-amber-100 p-2 text-center text-xs font-medium text-amber-700">
                  ⚠️ ทำรายการใน Grace Period — เครดิตติดลบชั่วคราว กรุณาเติมเงินที่หน้ากระเป๋าเงิน
                </p>
              )}
              <button
                onClick={resetScan}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-bold text-white shadow-lg transition active:scale-95 hover:bg-emerald-600"
              >
                <ScanLine className="h-5 w-5" /> สแกนบิลถัดไป
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}