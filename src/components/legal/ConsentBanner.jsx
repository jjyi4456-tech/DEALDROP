import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PRIVACY_POLICY_VERSION } from "@/lib/legalContent";
import PrivacyPolicyModal from "@/components/legal/PrivacyPolicyModal";

const CONSENT_KEY = "hqc_privacy_consent_v1";

// Bottom cookie/usage-data consent banner (PDPA notice). Shows once per
// device until accepted. bottomClass lifts it above the mobile bottom nav.
export default function ConsentBanner({ bottomClass = "bottom-0" }) {
  const [visible, setVisible] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(CONSENT_KEY));
  }, []);

  const accept = async () => {
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    setVisible(false);
    try {
      await base44.functions.invoke("logLegalConsent", {
        document_type: "cookie_consent",
        version: PRIVACY_POLICY_VERSION,
      });
    } catch (err) {
      // Anonymous visitor or offline — the local record still stands.
    }
  };

  if (!visible) return null;

  return (
    <>
      <div className={`fixed inset-x-0 ${bottomClass} z-40 px-4 pb-3`}>
        <div className="mx-auto max-w-md rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur sm:max-w-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Cookie className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold leading-snug">
                เราใช้คุกกี้และข้อมูลการใช้งาน เพื่อเก็บสถิติและปรับปรุงประสบการณ์ของคุณ
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                ตามพ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setPolicyOpen(true)}
              className="flex-1 rounded-xl border py-2.5 text-xs font-medium hover:bg-accent"
            >
              อ่านนโยบายความเป็นส่วนตัว
            </button>
            <button
              onClick={accept}
              className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              ยอมรับทั้งหมด
            </button>
          </div>
        </div>
      </div>
      <PrivacyPolicyModal
        open={policyOpen}
        onOpenChange={setPolicyOpen}
        onAccepted={accept}
      />
    </>
  );
}