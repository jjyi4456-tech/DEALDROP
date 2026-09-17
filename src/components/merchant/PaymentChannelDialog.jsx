import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard, QrCode, Loader2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";

import { TIER_LABELS } from "@/lib/plansConfig";

export default function PaymentChannelDialog({ open, plan, merchant, onClose }) {
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [method, setMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEmail(merchant?.email || "");
      setContactName(merchant?.owner_name || "");
      setMethod("card");
      setError("");
      setLoading(false);
    }
  }, [open, merchant]);

  if (!plan) return null;

  const confirm = async () => {
    setError("");
    if (!email.trim()) { setError("กรุณากรอกอีเมลสำหรับรับใบเสร็จ"); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("createCheckout", {
        merchant_id: merchant.id,
        plan_code: plan.code,
        origin: window.location.origin,
        payment_method: method,
        email: email.trim(),
        contact_name: contactName.trim(),
      });
      const url = res?.data?.url;
      if (!url) throw new Error(res?.data?.error || "ไม่สามารถสร้างหน้าชำระได้");
      window.location.href = url;
    } catch (e) {
      setError(String(e?.message || e));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เลือกช่องทางการชำระเงิน</DialogTitle>
          <DialogDescription>
            อัปเกรดเป็น {TIER_LABELS[plan.code] || plan.name} · ฿{(plan.code === "pro" ? 259 : plan.price).toLocaleString()}{method === "card" ? "/เดือน" : " /รอบ"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="pay-email">อีเมลรับใบเสร็จ</Label>
              <Input id="pay-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </div>
            <div>
              <Label htmlFor="pay-name">ชื่อผู้ติดต่อ</Label>
              <Input id="pay-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="ชื่อเจ้าของร้าน / ผู้ดูแล" />
            </div>
          </div>

          <div>
            <Label>วิธีการชำระเงิน</Label>
            <RadioGroup value={method} onValueChange={setMethod} className="mt-2 space-y-2">
              <label htmlFor="m-card" className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${method === "card" ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                <RadioGroupItem id="m-card" value="card" />
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">บัตรเครดิต / เดบิต</p>
                  <p className="text-xs text-muted-foreground">หักอัตโนมัติทุกเดือนผ่าน Stripe</p>
                </div>
              </label>
              <label htmlFor="m-qr" className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${method === "promptpay" ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                <RadioGroupItem id="m-qr" value="promptpay" />
                <QrCode className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">QR PromptPay</p>
                  <p className="text-xs text-muted-foreground">สแกน QR ชำระครั้งเดียว (THB) ผ่าน Stripe</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> ปลอดภัยโดย Stripe</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>ยกเลิก</Button>
              <Button onClick={confirm} disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังเปิดหน้าชำระ...</> : `ชำระ ฿${(plan.code === "pro" ? 259 : plan.price).toLocaleString()}`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}