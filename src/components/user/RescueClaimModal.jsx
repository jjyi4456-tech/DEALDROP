import { useState } from "react";
import { Flame, Clock, Sparkles, AlertCircle, QrCode, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import { inDays, rndCode } from "@/lib/questTime";

export default function RescueClaimModal({ deal, open, onOpenChange, onClaimSuccess }) {
  const [claiming, setClaiming] = useState(false);
  const [claimedCoupon, setClaimedCoupon] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);
  const { toast } = useToast();

  if (!deal) return null;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      if (!me) {
        toast({ title: "กรุณาเข้าสู่ระบบก่อนกดรับสิทธิ์", variant: "destructive" });
        return;
      }

      // 1. Check fresh deal stock
      const freshDeal = await base44.entities.RescueDeal.get(deal.id);
      if (!freshDeal || freshDeal.remaining_qty <= 0 || freshDeal.status !== "active") {
        toast({ title: "ขออภัย เมนูกู้ชีพนี้หมดแล้ว!", variant: "destructive" });
        onOpenChange(false);
        return;
      }

      // 2. Decrement remaining stock
      const newRemaining = freshDeal.remaining_qty - 1;
      await base44.entities.RescueDeal.update(deal.id, {
        remaining_qty: newRemaining,
        status: newRemaining === 0 ? "sold_out" : "active",
      });

      // 3. Generate QR code for pickup (Format: RESCUE-...)
      const rescueQrCode = `RESCUE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // 4. Create coupon in user's backpack with holding deadline
      const coupon = await base44.entities.Coupon.create({
        user_id: me.id,
        merchant_id: deal.merchant_id,
        merchant_name: deal.merchant_name,
        title: `🚨 ดีลกู้ชีพ: ${deal.item_name} (฿${deal.deal_price})`,
        reward_type: "menu",
        reward_value: deal.item_name,
        coupon_type: "rescue_deal",
        status: "available",
        qr_code: rescueQrCode,
        expires_at: deal.pickup_deadline,
        expiry_date: deal.pickup_deadline.split("T")[0],
      });

      // Generate QR data URL for instant display
      const dataUrl = await QRCode.toDataURL(rescueQrCode, {
        width: 400,
        margin: 2,
        color: { dark: "#b91c1c", light: "#ffffff" },
      });
      setQrUrl(dataUrl);
      setClaimedCoupon(coupon);

      // Trigger Confetti celebrating food waste prevention
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#f59e0b", "#ef4444"],
      });

      toast({
        title: "🎉 จองสิทธิ์กู้ชีพสำเร็จ!",
        description: `เก็บในกระเป๋าเป้แล้ว กรุณาไปรับก่อนเวลาที่กำหนดเพื่อรับ Eco-XP x2`,
      });

      if (onClaimSuccess) onClaimSuccess(coupon);
    } catch (err) {
      toast({ title: "จองสิทธิ์ไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  const handleClose = () => {
    setClaimedCoupon(null);
    setQrUrl(null);
    onOpenChange(false);
  };

  const deadlineTime = deal.pickup_deadline ? new Date(deal.pickup_deadline).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
        {!claimedCoupon ? (
          <>
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-2">
                <Flame className="h-6 w-6 animate-pulse" />
              </div>
              <DialogTitle className="text-xl font-black">ยืนยันจองเมนูกู้ชีพ</DialogTitle>
              <DialogDescription className="text-xs">
                ช่วยลดขยะอาหาร พร้อมรับสิทธิ์ราคาพิเศษและ Eco-XP x2
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 rounded-2xl border bg-muted/30 p-4 text-left space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">ร้านค้า</span>
                <span className="text-xs font-bold">{deal.merchant_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">เมนู</span>
                <span className="text-sm font-extrabold text-foreground">{deal.item_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">ราคาดีลกู้ชีพ</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-red-600">฿{deal.deal_price}</span>
                  <span className="text-xs text-muted-foreground line-through">฿{deal.original_price}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> รับของก่อน
                </span>
                <span className="text-xs font-bold text-amber-600">{deadlineTime} น. วันนี้</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-left space-y-1 text-emerald-900">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                รับ Eco-XP x2 (+100 XP)
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                🛡️ กติกากัน No-Show: เมื่อไปถึงร้าน ให้ยื่น QR Code ให้พนักงานสแกนรับของ หากไม่ไปรับตามเวลา สิทธิ์จะหลุดคืนเข้าระบบอัตโนมัติ
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1 rounded-xl">
                ยกเลิก
              </Button>
              <Button
                onClick={handleClaim}
                disabled={claiming}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 font-bold text-white hover:opacity-90"
              >
                {claiming ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "จองสิทธิ์ทันที"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center sm:text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-1">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <DialogTitle className="text-xl font-black">จองเมนูกู้ชีพสำเร็จ!</DialogTitle>
              <DialogDescription className="text-xs">
                ยื่น QR Code นี้ให้พนักงานร้านสแกนเพื่อรับอาหาร
              </DialogDescription>
            </DialogHeader>

            <div className="my-3 mx-auto w-56 rounded-2xl border-2 border-red-400 bg-white p-3 shadow-md">
              {qrUrl ? (
                <img src={qrUrl} alt="Rescue QR" className="w-full" />
              ) : (
                <div className="aspect-square flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="font-mono text-xs font-bold text-muted-foreground">{claimedCoupon.qr_code}</p>

            <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
              <p className="font-bold flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5" /> ต้องไปรับก่อน {deadlineTime} น.
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                พนักงานจะสแกนตัดสต็อกและส่งมอบ Eco-XP x2 ให้คุณทันที
              </p>
            </div>

            <Button onClick={handleClose} className="mt-4 w-full rounded-2xl bg-primary font-bold">
              เสร็จสิ้น (ดูในกระเป๋าเป้)
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
