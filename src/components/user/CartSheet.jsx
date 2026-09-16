import { Minus, Plus, PartyPopper, Loader2, Trash2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CouponLinkageStrip from "@/components/user/CouponLinkageStrip";

export default function CartSheet({
  open, onOpenChange, lines, total, discount, netTotal,
  coupons, selectedCouponId, onSelectCoupon,
  note, setNote, onLineQty, onRemoveLine, onPlace, placing, placed, onReset,
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {placed ? (
          <div className="mx-auto w-full max-w-md p-6 pb-8 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <PartyPopper className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-emerald-600">ส่งออเดอร์เข้าครัวเรียบร้อย! 🎉</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ร้านได้รับออเดอร์ของคุณแล้ว จ่ายเงินหน้าร้านตอนปิดบิลได้เลย
              {placed.table_no ? ` (${placed.table_no})` : ""}
            </p>
            <Button onClick={onReset} className="mt-5 w-full rounded-xl">สั่งเพิ่มอีก</Button>
          </div>
        ) : (
          <>
            <DrawerHeader>
              <DrawerTitle className="text-left">
                ตะกร้าของฉัน ({lines.reduce((s, l) => s + l.quantity, 0)} รายการ)
              </DrawerTitle>
            </DrawerHeader>
            <div className="max-h-[35vh] space-y-3 overflow-y-auto px-4">
              {lines.map((line, idx) => (
                <div key={idx} className="rounded-xl border p-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">฿{line.price} × {line.quantity} = ฿{line.price * line.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onLineQty(idx, -1)} className="flex h-8 w-8 items-center justify-center rounded-full border" aria-label={`ลด ${line.name}`}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{line.quantity}</span>
                      <button onClick={() => onLineQty(idx, 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label={`เพิ่ม ${line.name}`}>
                        <Plus className="h-4 w-4" />
                      </button>
                      <button onClick={() => onRemoveLine(idx)} className="flex h-8 w-8 items-center justify-center rounded-full border text-red-500" aria-label={`ลบ ${line.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {line.note && (
                    <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">📝 {line.note}</p>
                  )}
                </div>
              ))}
              {lines.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีรายการในตะกร้า</p>}
            </div>

            <div className="space-y-3 px-4 pt-3">
              <CouponLinkageStrip coupons={coupons} selectedId={selectedCouponId} onSelect={onSelectCoupon} />
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="โน้ตถึงร้าน เช่น รอครบก่อนเสิร์ฟ (ไม่บังคับ)"
                className="text-sm"
                rows={2}
              />
            </div>

            <DrawerFooter>
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ยอดอาหาร</span>
                  <span className="font-semibold">฿{total}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ส่วนลดคูปอง</span>
                    <span className="font-bold text-emerald-600">-฿{discount}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2">
                  <p className="text-sm font-bold">ยอดจ่ายจริงหน้าร้าน</p>
                  <p className="text-lg font-extrabold text-primary">฿{netTotal}</p>
                </div>
                <Button
                  onClick={onPlace}
                  disabled={placing || lines.length === 0}
                  className="w-full rounded-xl py-3 text-sm font-bold"
                >
                  {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันสั่งอาหารส่งเข้าครัว (Place Order)"}
                </Button>
              </div>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}