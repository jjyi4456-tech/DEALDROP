import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SWEETNESS = ["ไม่ใส่น้ำตาล", "หวานน้อย", "หวานพอดี", "หวานมาก"];
const SPICY = ["ไม่เผ็ด", "เผ็ดน้อย", "เผ็ดกลาง", "เผ็ดมาก"];

// Customization Modal: sweetness, spice level and a kitchen note for one menu
// item. Confirming adds the configured line to the cart.
export default function MenuItemCustomizeModal({ item, open, onOpenChange, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [sweet, setSweet] = useState("");
  const [spicy, setSpicy] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setQty(1);
      setSweet("");
      setSpicy("");
      setNote("");
    }
  }, [open, item?.id]);

  if (!item) return null;

  const confirm = () => {
    const parts = [];
    if (sweet) parts.push(`หวาน: ${sweet}`);
    if (spicy) parts.push(`เผ็ด: ${spicy}`);
    if (note.trim()) parts.push(note.trim());
    onConfirm({
      menu_id: item.id,
      name: item.name,
      price: item.price,
      quantity: qty,
      note: parts.join(" · "),
    });
    onOpenChange(false);
  };

  const chipCls = (active) =>
    `rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
      active ? "bg-primary text-primary-foreground" : "border bg-card text-foreground"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-left">แต่งเมนู: {item.name}</DialogTitle>
          <DialogDescription className="text-left">
            เลือกระดับความหวาน/ความเผ็ด และฝากบอกครัวได้เลย (ไม่บังคับ)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-bold text-muted-foreground">ความหวาน</p>
            <div className="flex flex-wrap gap-2">
              {SWEETNESS.map((s) => (
                <button key={s} onClick={() => setSweet(s === sweet ? "" : s)} className={chipCls(s === sweet)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold text-muted-foreground">ระดับความเผ็ด</p>
            <div className="flex flex-wrap gap-2">
              {SPICY.map((s) => (
                <button key={s} onClick={() => setSpicy(s === spicy ? "" : s)} className={chipCls(s === spicy)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-bold text-muted-foreground">หมายเหตุถึงครัว</p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผักชี แยกน้ำจิ้ม"
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border"
              aria-label="ลดจำนวน"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-label="เพิ่มจำนวน"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={confirm} className="flex-1 rounded-xl py-3 text-sm font-bold">
            เพิ่มลงตะกร้า · ฿{item.price * qty}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}