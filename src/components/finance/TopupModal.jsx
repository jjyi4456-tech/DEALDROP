import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard, QrCode } from "lucide-react";

const PRESETS = [
  { v: 300, tag: null },
  { v: 500, tag: "แนะนำ ⭐" },
  { v: 1000, tag: "แถมเครดิตโบนัส 50 บ." },
];
const MIN_TOPUP = 100;

// Top-up modal: pick a preset or custom amount, then hand off to the real
// Stripe Checkout (Thai PromptPay QR / debit-credit card) via createCheckout.
export default function TopupModal({ open, toppingUp, onConfirm, onClose }) {
  const [preset, setPreset] = useState(500);
  const [custom, setCustom] = useState("");

  const customAmount = Number(custom);
  const useCustom = custom.trim() !== "" && Number.isFinite(customAmount) && customAmount > 0;
  const amount = useCustom ? customAmount : preset;
  const valid = amount >= MIN_TOPUP;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>เติมเครดิตร้านค้า</DialogTitle>
          <DialogDescription>เลือกจำนวนเงินที่ต้องการเติม</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {PRESETS.map((p) => (
            <button
              key={p.v}
              onClick={() => { setPreset(p.v); setCustom(""); }}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                !useCustom && preset === p.v ? "border-primary bg-primary/5" : "hover:bg-accent"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold">฿{p.v.toLocaleString()}</span>
                {!useCustom && preset === p.v && <span className="text-xs font-semibold text-primary">✓ เลือกอยู่</span>}
              </div>
              {p.tag && <p className="text-xs text-muted-foreground">{p.tag}</p>}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">หรือระบุจำนวนเงินเอง (ขั้นต่ำ ฿{MIN_TOPUP})</p>
          <Input
            type="number"
            min={MIN_TOPUP}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="เช่น 750"
          />
        </div>

        <p className="flex items-center gap-2 rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
          <QrCode className="h-4 w-4 shrink-0 text-primary" />
          สแกนจ่ายผ่าน Thai PromptPay QR หรือบัตรเดบิต/เครดิต
        </p>

        <button
          onClick={() => onConfirm(amount)}
          disabled={!valid || toppingUp}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg transition active:scale-95 hover:bg-primary/90 disabled:opacity-50"
        >
          {toppingUp ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
          {toppingUp ? "กำลังเปิดหน้าชำระเงิน..." : "ไปที่หน้าชำระเงิน Stripe →"}
        </button>
      </DialogContent>
    </Dialog>
  );
}