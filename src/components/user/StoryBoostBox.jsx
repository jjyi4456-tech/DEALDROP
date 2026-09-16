import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Copy, Check } from "lucide-react";

// 📸 Story Boost mission box (Instagram gradient) shown in the coupon QR modal:
// invites the customer to post an IG story tagging the shop for an extra
// discount, with a 1-click copy button for the shop's IG handle.
export default function StoryBoostBox({ merchantId }) {
  const [merchant, setMerchant] = useState(undefined); // undefined = loading
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!merchantId) return;
    base44.entities.Merchant.get(merchantId)
      .then((m) => setMerchant(m || null))
      .catch(() => setMerchant(null));
  }, [merchantId]);

  if (merchant === undefined || !merchant?.story_boost_enabled) return null;

  const handle = (merchant.instagram || "").replace(/^@+/, "");
  if (!handle) return null;
  const percent = merchant.story_boost_percent != null ? merchant.story_boost_percent : 5;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText("@" + handle);
      setCopied(true);
      toast({ title: "คัดลอกชื่อ IG ร้านแล้ว", description: `กดแท็ก @${handle} ในสตอรี่ได้เลย` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "คัดลอกไม่สำเร็จ", variant: "destructive" });
    }
  };

  return (
    <div className="mt-3 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-rose-500 p-[2px] text-left shadow-md">
      <div className="rounded-[14px] bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white">
            <Camera className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold leading-snug">📸 ช็อตเด็ดบอกต่อ!</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ถ่ายรูปอาหาร/บรรยากาศร้าน โพสต์ลง IG Story พร้อมแท็ก{" "}
              <span className="font-bold text-fuchsia-600">@{handle}</span>
            </p>
            <p className="mt-2 rounded-lg bg-fuchsia-50 px-2.5 py-1.5 text-xs font-bold text-fuchsia-700">
              โชว์สตอรี่ให้แคชเชียร์ดู รับส่วนลดเพิ่มทันที +{percent}% ในบิลนี้!
            </p>
            <button
              type="button"
              onClick={copy}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300 bg-card px-3 py-1.5 text-xs font-semibold text-fuchsia-600 transition hover:bg-fuchsia-50"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "คัดลอกแล้ว!" : "คัดลอกชื่อ IG ร้าน"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}