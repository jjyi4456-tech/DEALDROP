import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, CheckCircle2, Loader2 } from "lucide-react";
import StoryBoostBox from "@/components/user/StoryBoostBox";

const rewardLabel = { percent: "ส่วนลด %", cash: "ลดเงินสด", menu: "แถมเมนู" };

// Big QR modal: tap a coupon card to show a scannable QR plus expiry and status.
export default function CouponQrModal({ coupon, onClose }) {
  const [qrUrl, setQrUrl] = useState(null);

  useEffect(() => {
    setQrUrl(null);
    if (!coupon?.qr_code) return;
    QRCode.toDataURL(coupon.qr_code, { width: 640, margin: 2, color: { dark: "#1f2937", light: "#ffffff" } })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [coupon?.qr_code]);

  if (!coupon) return null;
  const used = coupon.status === "used";
  const expired = coupon.status === "expired";

  return (
    <Dialog open={!!coupon} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl text-center">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold leading-snug">
            {coupon.coupon_type === "rescue_deal" ? "🚨 บัตรรับเมนูกู้ชีพ (Rescue Deal)" : coupon.title}
          </DialogTitle>
          <DialogDescription>
            🏪 {coupon.merchant_name} · {coupon.coupon_type === "rescue_deal" ? coupon.title : `${rewardLabel[coupon.reward_type] || "สิทธิ์"} ${coupon.reward_value}`}
          </DialogDescription>
        </DialogHeader>

        {coupon.coupon_type === "rescue_deal" && (
          <div className="mx-auto mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            🌱 รับ Eco-XP x2 (+100 XP) เมื่อสแกนรับของที่หน้าร้าน
          </div>
        )}

        <div className={`mx-auto w-56 rounded-2xl border bg-white p-3 shadow-sm ${used || expired ? "opacity-40 grayscale" : ""}`}>
          {qrUrl ? (
            <img src={qrUrl} alt="Coupon QR" className="w-full" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <p className="mt-2 font-mono text-xs tracking-wide text-muted-foreground">{coupon.qr_code}</p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium">
            <Clock className="h-3 w-3" /> หมดอายุ {coupon.expiry_date}
          </span>
          {used && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> ใช้แล้ว {coupon.redeemed_date}
            </span>
          )}
          {expired && <span className="rounded-full bg-red-50 px-2.5 py-1 font-bold text-red-500">หมดอายุแล้ว</span>}
        </div>

        {!used && !expired && <StoryBoostBox merchantId={coupon.merchant_id} />}

        <p className="mt-3 text-xs text-muted-foreground">แสดง QR นี้ให้ร้านค้าสแกนตอนจ่ายบิลเพื่อใช้สิทธิ์</p>
      </DialogContent>
    </Dialog>
  );
}