import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { PRIVACY_POLICY, PRIVACY_POLICY_VERSION, privacyPolicySummary } from "@/lib/legalContent";

// PDPA privacy policy modal — full policy in collapsible sections with the
// key protections highlighted up top. When onAccepted is provided the footer
// button records the consent (privacy_policy) in the legal audit trail.
export default function PrivacyPolicyModal({ open, onOpenChange, onAccepted }) {
  const [accepting, setAccepting] = useState(false);
  const { toast } = useToast();

  const accept = async () => {
    setAccepting(true);
    try {
      await base44.functions.invoke("logLegalConsent", {
        document_type: "privacy_policy",
        version: PRIVACY_POLICY_VERSION,
      });
      toast({ title: "บันทึกการยอมรับนโยบายแล้ว", description: `เวอร์ชัน ${PRIVACY_POLICY_VERSION}` });
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
        <DialogHeader className="border-b bg-gradient-to-br from-indigo-50 to-violet-50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            นโยบายความเป็นส่วนตัว (PDPA)
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            ตามพ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 · เวอร์ชัน {PRIVACY_POLICY_VERSION}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {/* Key protections at a glance */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            {privacyPolicySummary.map((s) => (
              <div key={s.label} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5">
                <p className="text-[11px] font-medium text-indigo-500">{s.label}</p>
                <p className="text-xs font-semibold leading-snug text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          <Accordion type="single" collapsible defaultValue="item-0" className="space-y-2">
            {PRIVACY_POLICY.map((sec, idx) => (
              <AccordionItem key={sec.title} value={`item-${idx}`} className="rounded-xl border px-4">
                <AccordionTrigger className="py-3 text-left text-sm font-bold hover:no-underline">
                  {sec.title}
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pb-3">
                  {sec.clauses.map((c, i) => (
                    <p key={i} className="text-[13px] leading-relaxed text-muted-foreground">
                      {c}
                    </p>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="border-t bg-muted/30 px-5 py-4">
          {onAccepted ? (
            <Button onClick={accept} disabled={accepting} className="h-11 w-full rounded-xl font-semibold">
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" /> เข้าใจและยอมรับนโยบายนี้
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange?.(false)} className="h-11 w-full rounded-xl font-medium">
              ปิดหน้าต่าง
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}