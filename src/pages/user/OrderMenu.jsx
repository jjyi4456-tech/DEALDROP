import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ShoppingBag, UtensilsCrossed, Ticket } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Image } from "@/components/ui/image";
import MenuList from "@/components/user/MenuList";
import CartSheet from "@/components/user/CartSheet";
import MenuItemCustomizeModal from "@/components/user/MenuItemCustomizeModal";

export default function OrderMenu() {
  const { merchantId } = useParams();
  const { toast } = useToast();
  const [merchant, setMerchant] = useState(null);
  const [items, setItems] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [selectedCouponId, setSelectedCouponId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]); // [{ menu_id, name, price, quantity, note }]
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [customizeItem, setCustomizeItem] = useState(null);

  // Table QR link: /user/order/:merchantId?table=3 → "โต๊ะ 3", else pick-up
  const tableNo = useMemo(() => {
    const t = new URLSearchParams(window.location.search).get("table");
    return t ? `โต๊ะ ${t}` : "Pick-up";
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const merchants = await base44.entities.Merchant.list();
        const m = merchants.find((x) => x.id === merchantId) || null;
        setMerchant(m);
        const menu = await base44.entities.MenuItem.filter({ merchant_id: merchantId });
        setItems(menu.filter((i) => i.available !== false));

        // Auto-Coupon Linkage: my usable coupons for THIS shop
        const me = await base44.auth.me().catch(() => null);
        if (me) {
          const today = new Date().toISOString().slice(0, 10);
          const mine = await base44.entities.Coupon.filter(
            { user_id: me.id, status: "available" }, "-created_date", 50
          ).catch(() => []);
          setCoupons(mine.filter(
            (c) => c.merchant_id === merchantId
              && ["percent", "cash"].includes(c.reward_type)
              && (!c.expiry_date || c.expiry_date >= today)
          ));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  // ---- cart helpers (line-based: each customization is its own line) ----
  const addLine = (line) =>
    setCart((c) => {
      const i = c.findIndex((l) => l.menu_id === line.menu_id && (l.note || "") === (line.note || ""));
      if (i >= 0) {
        const next = [...c];
        next[i] = { ...next[i], quantity: next[i].quantity + line.quantity };
        return next;
      }
      return [...c, line];
    });

  const quickAdd = (item) =>
    addLine({ menu_id: item.id, name: item.name, price: item.price, quantity: 1, note: "" });

  const decrement = (item) =>
    setCart((c) => {
      for (let i = c.length - 1; i >= 0; i--) {
        if (c[i].menu_id === item.id) {
          const next = [...c];
          if (next[i].quantity > 1) next[i] = { ...next[i], quantity: next[i].quantity - 1 };
          else next.splice(i, 1);
          return next;
        }
      }
      return c;
    });

  const onLineQty = (idx, delta) =>
    setCart((c) => {
      const next = [...c];
      const q = next[idx].quantity + delta;
      if (q <= 0) next.splice(idx, 1);
      else next[idx] = { ...next[idx], quantity: q };
      return next;
    });

  const onRemoveLine = (idx) => setCart((c) => c.filter((_, i) => i !== idx));

  // ---- totals with coupon discount ----
  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const selectedCoupon = coupons.find((c) => c.id === selectedCouponId) || null;
  const discount = selectedCoupon
    ? selectedCoupon.reward_type === "percent"
      ? Math.round(total * (Number(selectedCoupon.reward_value) || 0)) / 100
      : Math.min(Number(selectedCoupon.reward_value) || 0, total)
    : 0;
  const netTotal = Math.max(0, Math.round((total - discount) * 100) / 100);

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const order = await base44.entities.Order.create({
        merchant_id: merchant.id,
        merchant_name: merchant.name,
        merchant_owner_id: merchant.created_by_id,
        user_id: me?.id,
        user_name: me?.full_name || me?.email || "ลูกค้า",
        table_no: tableNo,
        items: cart.map((l) => ({ menu_id: l.menu_id, name: l.name, price: l.price, quantity: l.quantity, note: l.note || "" })),
        total,
        total_amount: total,
        discount_amount: discount,
        net_paid: netTotal,
        coupon_id: selectedCouponId || null,
        note,
        status: "pending",
      });
      setPlaced(order);
    } catch (e) {
      toast({ title: "ส่งออเดอร์ไม่สำเร็จ", description: "ลองอีกครั้งนะ ถ้ายังไม่ได้แจ้งพนักงานร้านให้ช่วยดู", variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  const resetOrder = () => {
    setPlaced(null);
    setCart([]);
    setNote("");
    setSelectedCouponId(null);
    setCartOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">ไม่พบร้านนี้</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {merchant.logo_url ? (
            <Image src={merchant.logo_url} alt={merchant.name} fittingType="fill" className="h-12 w-12 shrink-0 rounded-full border" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight">{merchant.name}</h1>
            <p className="text-xs text-muted-foreground">สแกนสั่งจากโต๊ะ ส่งเข้าครัวทันที 🍽️</p>
          </div>
          <span className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground shadow-sm">
            🪑 {tableNo}
          </span>
        </div>
      </div>

      <MenuList items={items} lines={cart} onQuickAdd={quickAdd} onCustomize={setCustomizeItem} onDecrement={decrement} />

      {count > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-[4.5rem] z-40 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-lg transition active:scale-95"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingBag className="h-4 w-4" /> {count} รายการ
            {discount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                <Ticket className="h-3 w-3" /> -฿{discount}
              </span>
            )}
          </span>
          <span className="text-sm font-bold">฿{netTotal} · ดูตะกร้า →</span>
        </button>
      )}

      <MenuItemCustomizeModal
        item={customizeItem}
        open={!!customizeItem}
        onOpenChange={(o) => !o && setCustomizeItem(null)}
        onConfirm={addLine}
      />

      <CartSheet
        open={cartOpen}
        onOpenChange={(o) => {
          setCartOpen(o);
          if (!o && placed) resetOrder();
        }}
        lines={cart}
        total={total}
        discount={discount}
        netTotal={netTotal}
        coupons={coupons}
        selectedCouponId={selectedCouponId}
        onSelectCoupon={setSelectedCouponId}
        note={note}
        setNote={setNote}
        onLineQty={onLineQty}
        onRemoveLine={onRemoveLine}
        onPlace={placeOrder}
        placing={placing}
        placed={placed}
        onReset={resetOrder}
      />
    </div>
  );
}