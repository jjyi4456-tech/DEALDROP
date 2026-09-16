import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollText, ShieldCheck, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { MERCHANT_TERMS, MERCHANT_TERMS_VERSION, merchantTermsSummary } from "@/lib/legalContent";

// Merchant Partner Agreement modal: the accept checkbox unlocks only after
// the merchant has scrolled to the bottom of the terms. Accepting writes a
// LegalConsentLog record (legal audit trail) and calls onAccepted.
export default function MerchantTermsModal({ open, onOpenChange, merchantId, merchantName, onAccepted }) {
  const [reachedBottom, setReachedBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const scrollRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setReachedBottom(false);
      setChecked(false);
      // Terms shorter than the scroll area count as fully read.
      const el = scrollRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 24) setReachedBottom(true);
    }
  }, [open]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReachedBottom(true);
  };

  const accept = async () => {
    setAccepting(true);
    try {
      await base44.functions.invoke("logLegalConsent", {
        document_type: "merchant_agreement",
        version: MERCHANT_TERMS_VERSION,
        merchant_id: merchantId || null,
        merchant_name: merchantName || null,
      });
      toast({
        title: "บันทึกการยอมรับข้อตกลงแล้ว",
        description: `ข้อตกลงพาร์ทเนอร์ เวอร์ชัน ${MERCHANT_TERMS_VERSION}`,
      });
      setAccepting(false);
      onOpenChange?.(false);
      onAccepted?.();
    } catch (err) {
      setAccepting(false);
      toast({
        title: "บันทึกการยอมรับไม่สำเร็จ",
        description: "กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[92vw] max-w-lg overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ScrollText className="h-5 w-5 text-primary" />
            ข้อตกลงพาร์ทเนอร์ร้านค้า
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            ข้อตกลงการให้บริการและเงื่อนไขค่าคอมมิชชัน · เวอร์ชัน {MERCHANT_TERMS_VERSION} ·
            การกดยอมรับจะถูกบันทึกเวลาและอุปกรณ์เป็นหลักฐานทางกฎหมาย
          </DialogDescription>
        </DialogHeader>

        {/* Key terms at a glance */}
        <div className="grid grid-cols-2 gap-2 px-5 pt-4">
          {merchantTermsSummary.map((s) => (
            <div key={s.label} className="rounded-xl border bg-muted/40 p-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
              <p className="text-xs font-semibold leading-snug">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Scrollable full terms */}
        <div ref={scrollRef} onScroll={onScroll} className="max-h-[45vh] overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            {MERCHANT_TERMS.map((sec) => (
              <section key={sec.title}>
                <h3 className="mb-1.5 text-sm font-bold">{sec.title}</h3>
                <div className="space-y-1.5">
                  {sec.clauses.map((c, i) => (
                    <p key={i} className="text-[13px] leading-relaxed text-muted-foreground">
                      {c}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Consent controls */}
        <div className="border-t bg-muted/30 px-5 py-4">
          <p className="mb-2 text-center text-[11px] text-muted-foreground">
            {reachedBottom ? "✓ อ่านครบถ้วนแล้ว" : "โปรดเลื่อนอ่านเนื้อหาจนถึงท้ายสุดเพื่อยืนยัน"}
          </p>
          <label className="flex items-start gap-2.5">
            <Checkbox checked={checked} disabled={!reachedBottom} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
            <span className="text-[13px] font-medium leading-snug">
              ข้าพเจ้ายอมรับเงื่อนไขค่าคอมมิชชันและรอบการชำระเงิน ตามข้อตกลงฉบับนี้ทั้งหมด
            </span>
          </label>
          <Button onClick={accept} disabled={!checked || accepting} className="mt-3 h-11 w-full rounded-xl font-semibold">
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" /> ยอมรับข้อตกลง
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}