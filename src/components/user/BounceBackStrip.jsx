import useCountdown from "@/hooks/useCountdown";

// 🔥 Extra strip on Bounce-Back coupons in the bag: burning urgency badge,
// live 7-day countdown, and a one-tap share to invite friends back to the shop.
export default function BounceBackStrip({ coupon }) {
  const msLeft = useCountdown(coupon.expires_at);
  const days = Math.floor(msLeft / 86400000);
  const hours = Math.floor((msLeft % 86400000) / 3600000);

  const invite = async () => {
    const text = `🎁 ไปทานกันต่อที่ร้าน ${coupon.merchant_name}! ฉันได้ส่วนลดมื้อถัดไป มาเปิดตี้กันที่ DEALDROP 👉 https://dealdrop.app`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        /* user dismissed — fall through to LINE */
      }
    }
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className="animate-pulse rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
        🔥 สิทธิ์ด่วน 7 วัน
      </span>
      <span className="text-xs font-bold text-red-600">
        เหลือเวลาอีก {days} วัน {hours} ชม.
      </span>
      <button
        onClick={invite}
        className="ml-auto rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm transition active:scale-95"
      >
        ชวนเพื่อนไปซ้ำ
      </button>
    </div>
  );
}