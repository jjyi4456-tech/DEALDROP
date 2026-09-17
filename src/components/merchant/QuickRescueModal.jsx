import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Flame, Clock, Sparkles, Loader2, Utensils, CheckCircle2 } from "lucide-react";

export default function QuickRescueModal({ open, onOpenChange, onCreated }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [merchant, setMerchant] = useState(null);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [dealPrice, setDealPrice] = useState("");
  const [initialQty, setInitialQty] = useState(3);
  const [pickupDeadline, setPickupDeadline] = useState("");
  const { toast } = useToast();

  // Load merchant and their menu items
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingMenu(true);
      try {
        const me = await base44.auth.me().catch(() => null);
        if (!me) return;
        const merchants = await base44.entities.Merchant.filter({ created_by_id: me.id }, "-created_date", 1);
        const m = merchants[0] || null;
        setMerchant(m);

        if (m) {
          const items = await base44.entities.MenuItem.filter({ merchant_id: m.id, available: true }).catch(() => []);
          setMenuItems(items);
        }

        // Default pickup deadline: 2 hours from now or 20:30
        const d = new Date();
        d.setHours(d.getHours() + 2);
        const defaultTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        setPickupDeadline(defaultTime);
      } finally {
        setLoadingMenu(false);
      }
    })();
  }, [open]);

  // When user selects a menu item
  const handleSelectItem = (item) => {
    setSelectedItemId(item.id);
    setItemName(item.name);
    setItemImage(item.image_url || "");
    setOriginalPrice(item.price);
    // Suggest 50% clearance discount
    setDealPrice(Math.round(item.price * 0.5));
  };

  const origP = Number(originalPrice) || 0;
  const dealP = Number(dealPrice) || 0;
  const discountPct = origP > 0 ? Math.round(((origP - dealP) / origP) * 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!merchant) {
      toast({ title: "ไม่พบข้อมูลร้านค้า", variant: "destructive" });
      return;
    }
    if (!itemName.trim()) {
      toast({ title: "กรุณาระบุชื่อเมนูอาหาร", variant: "destructive" });
      return;
    }
    if (dealP <= 0 || dealP >= origP) {
      toast({ title: "ราคาดีลต้องน้อยกว่าราคาปกติ", variant: "destructive" });
      return;
    }
    if (!initialQty || initialQty < 1) {
      toast({ title: "กรุณาระบุจำนวนชิ้นอย่างน้อย 1 ชิ้น", variant: "destructive" });
      return;
    }
    if (!pickupDeadline) {
      toast({ title: "กรุณากำหนดเวลารับของหน้าร้าน", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Calculate today's pickup datetime
      const todayStr = new Date().toISOString().split("T")[0];
      const fullDeadlineIso = `${todayStr}T${pickupDeadline}:00`;

      const newDeal = await base44.entities.RescueDeal.create({
        merchant_id: merchant.id,
        merchant_name: merchant.name,
        menu_item_id: selectedItemId || null,
        item_name: itemName.trim(),
        item_image: itemImage || null,
        original_price: origP,
        deal_price: dealP,
        initial_qty: Number(initialQty),
        remaining_qty: Number(initialQty),
        pickup_deadline: fullDeadlineIso,
        status: "active",
        eco_xp: 100, // Eco-XP x2
      });

      toast({
        title: "🚨 ปล่อยดีลกู้ชีพสำเร็จแล้ว!",
        description: `เปิดรับจอง "${itemName}" จำนวน ${initialQty} ชิ้น ถึงเวลา ${pickupDeadline} น.`,
      });

      if (onCreated) onCreated(newDeal);
      onOpenChange(false);
    } catch (err) {
      toast({ title: "ปล่อยดีลไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 text-white shadow-md">
              <Flame className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <DialogTitle className="text-xl font-black">🚨 ปล่อยดีลกู้ชีพด่วน</DialogTitle>
              <DialogDescription className="text-xs">
                เคลียร์สต็อกเมนูเฉพาะ ลด Food Waste ภายใน 30 วินาที
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quick Item Picker from Menu */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground">เลือกจากเมนูอาหารที่มีอยู่ (คลิกเดียวใส่ข้อมูลทันที)</Label>
            {loadingMenu ? (
              <div className="mt-1 flex items-center justify-center py-3 bg-muted/40 rounded-xl">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : menuItems.length > 0 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border p-2 text-left text-xs transition ${
                      selectedItemId === item.id ? "border-primary bg-primary/10 font-bold" : "bg-card hover:bg-muted"
                    }`}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Utensils className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="line-clamp-1 max-w-[100px]">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">฿{item.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">ยังไม่มีรายการเมนูในระบบ สามารถพิมพ์ชื่อด้านล่างได้โดยตรง</p>
            )}
          </div>

          {/* Item Name */}
          <div className="space-y-1">
            <Label htmlFor="item-name" className="text-xs font-bold">ชื่อเมนูกู้ชีพ</Label>
            <Input
              id="item-name"
              placeholder="เช่น ข้าวแกงกะหรี่ไก่ทอด, ครัวซองต์เนยสด"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">ราคาปกติ (฿)</Label>
              <Input
                type="number"
                placeholder="120"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-red-600">ราคาดีลกู้ชีพ (฿)</Label>
                {discountPct > 0 && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-600">
                    ลด {discountPct}%
                  </span>
                )}
              </div>
              <Input
                type="number"
                placeholder="59"
                value={dealPrice}
                onChange={(e) => setDealPrice(e.target.value)}
                className="border-red-300 focus-visible:ring-red-400 font-bold text-red-600"
                required
              />
            </div>
          </div>

          {/* Quantity & Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">จำนวนที่ปล่อย (ชิ้น/ชุด)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={initialQty}
                onChange={(e) => setInitialQty(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">รับได้ถึงเวลา</Label>
              <Input
                type="time"
                value={pickupDeadline}
                onChange={(e) => setPickupDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Eco-XP Badge info */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              โบนัสกู้โลก: ลูกค้าได้รับ Eco-XP x2 (+100 XP) เมื่อมารับอาหารที่หน้าร้าน
            </div>
            <p className="mt-1 text-[11px] text-emerald-700">
              ระบบมีเกราะป้องกัน No-Show: ลูกค้าต้องสแกน QR รับของภายในเวลา หากไม่มาสิทธิ์จะหลุดคืนกลับเข้าระบบอัตโนมัติ
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 font-extrabold text-white shadow-lg hover:opacity-95 active:scale-98 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังปล่อยดีล...
              </>
            ) : (
              <>
                <Flame className="mr-2 h-5 w-5" /> ปล่อยดีลกู้ชีพทันที (Launch Rescue)
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
