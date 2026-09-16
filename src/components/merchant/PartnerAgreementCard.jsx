import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileCheck2, ScrollText, ShieldCheck } from "lucide-react";
import MerchantTermsModal from "@/components/legal/MerchantTermsModal";
import { MERCHANT_TERMS_VERSION } from "@/lib/legalContent";

// Merchant portal card: shows whether the current merchant has accepted the
// Partner Agreement (from the legal audit trail) and lets them view/re-accept.
export default function PartnerAgreementCard({ merchantId, merchantName }) {
  const [accepted, setAccepted] = useState(null); // null = loading
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const logs = await base44.entities.LegalConsentLog.filter(
        { document_type: "merchant_agreement" },
        "-created_date",
        1
      );
      setAccepted(logs[0] || false);
    } catch {
      setAccepted(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const isAccepted = Boolean(accepted);

  return (
    <div className="mt-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isAccepted ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          {isAccepted ? <ShieldCheck className="h-5 w-5" /> : <ScrollText className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">ข้อตกลงพาร์ทเนอร์ & ค่าคอมมิชชัน</h3>
          {isAccepted ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              ยอมรับแล้วเมื่อ{" "}
              {new Date(accepted.accepted_at || accepted.created_date).toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · เวอร์ชัน {accepted.version} · การยอมรับถูกบันทึกเป็นหลักฐานทางกฎหมาย
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-amber-600">
              ยังไม่ได้ยอมรับข้อตกลง — ต้องยอมรับก่อนเปิดใช้งานระบบรับเงินและการตัดรอบโอนเงิน
            </p>
          )}
          <button
            onClick={() => setOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <FileCheck2 className="h-4 w-4" />
            {isAccepted ? `ดูข้อตกลง (${MERCHANT_TERMS_VERSION})` : "อ่านและยอมรับข้อตกลง"}
          </button>
        </div>
      </div>

      <MerchantTermsModal
        open={open}
        onOpenChange={setOpen}
        merchantId={merchantId}
        merchantName={merchantName}
        onAccepted={load}
      />
    </div>
  );
}