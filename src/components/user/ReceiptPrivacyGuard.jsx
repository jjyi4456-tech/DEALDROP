import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Receipt, ShieldAlert, Upload, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Image } from "@/components/ui/image";
import PrivacyPolicyModal from "@/components/legal/PrivacyPolicyModal";
import { PRIVACY_POLICY_VERSION } from "@/lib/legalContent";

// PDPA guard + receipt upload: warns the user to mask card numbers before
// uploading, requires explicit consent, then runs the AI bill verification.
export default function ReceiptPrivacyGuard() {
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [policyOpen, setPolicyOpen] = useState(false);
  const fileRef = useRef(null);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setResult(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!consent || !file) return;
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      // Record the receipt-processing consent (legal audit trail).
      try {
        await base44.functions.invoke("logLegalConsent", {
          document_type: "receipt_processing",
          version: PRIVACY_POLICY_VERSION,
        });
      } catch (err) {
        // Consent logging must not block the verification itself.
      }
      const res = await base44.functions.invoke("verifyReceiptAI", {
        receipt_image_url: file_url,
        type: "dine_in_bill",
      });
      const r = res?.data || res;
      setResult(r);
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || err?.message || "ตรวจสอบไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold">ส่งใบเสร็จรับแต้ม</p>
          <p className="text-xs text-muted-foreground">อัปโหลดสลิปเพื่อยืนยันยอดใช้จ่ายและรับ XP</p>
        </div>
      </div>

      {/* PDPA warning */}
      <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-xs font-medium leading-relaxed text-amber-800">
          ⚠️ เพื่อความปลอดภัยของท่าน กรุณาปิดบังหรือเบลอเลขบัตรเครดิต 16 หลัก และข้อมูลส่วนตัวบนใบเสร็จก่อนอัปโหลด
          ระบบจะเก็บรูปต้นฉบับไม่เกิน 90 วันตามนโยบาย PDPA
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Consent checkbox */}
        <label className="flex items-start gap-2.5">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <span className="text-xs leading-snug">
            ข้าพเจ้ายินยอมให้ระบบตรวจสอบรูปภาพเพื่อยืนยันยอดบิลตาม{" "}
            <button type="button" onClick={() => setPolicyOpen(true)} className="font-semibold text-primary hover:underline">
              นโยบาย PDPA
            </button>
          </span>
        </label>

        {/* File picker + preview */}
        {!file ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-7 text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs font-medium">แตะเพื่อเลือกรูปใบเสร็จ (JPG / PNG)</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/30 p-3">
            <Image src={preview} alt="ตัวอย่างใบเสร็จ" className="h-16 w-16 rounded-xl border object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button onClick={reset} className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
              เปลี่ยนรูป
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

        {/* Result */}
        {error && <div className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">{error}</div>}
        {result && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              result.is_duplicate
                ? "bg-red-50 text-red-600"
                : result.status === "verified"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {result.is_duplicate ? (
                <>
                  <XCircle className="h-4 w-4" /> ใบเสร็จนี้เคยใช้ในระบบแล้ว ไม่สามารถใช้ซ้ำได้
                </>
              ) : result.status === "verified" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> ตรวจสอบผ่านแล้ว · ยอดบิล ฿{Number(result.gross_amount || 0).toLocaleString()}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" /> ได้รับเรียบร้อย — อยู่ระหว่างตรวจสอบโดยผู้ดูแลระบบ
                </>
              )}
            </div>
            {!result.is_duplicate && (
              <p className="mt-1 text-xs opacity-80">
                {result.status === "verified"
                  ? "แต้มและ XP จะถูกเพิ่มให้อัตโนมัติ"
                  : `ระบบจะแจ้งผลภายใน 1-2 วันทำการ · ยอดที่ตรวจพบ ฿${Number(result.gross_amount || 0).toLocaleString()}`}
              </p>
            )}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!consent || !file || uploading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow transition active:scale-95 hover:bg-primary/90 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> กำลังตรวจสอบด้วย AI...
            </>
          ) : (
            "ส่งใบเสร็จตรวจสอบ"
          )}
        </button>
      </div>

      <PrivacyPolicyModal open={policyOpen} onOpenChange={setPolicyOpen} />
    </div>
  );
}