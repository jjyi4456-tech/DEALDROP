import { Plus, Minus, SlidersHorizontal } from "lucide-react";
import { Image } from "@/components/ui/image";

const CATS = [
  { key: "food", label: "🍜 อาหาร" },
  { key: "beverage", label: "🧋 เครื่องดื่ม" },
  { key: "dessert", label: "🍰 ของหวาน" },
];

export default function MenuList({ items, lines, onQuickAdd, onCustomize, onDecrement }) {
  const qtyOf = (id) => (lines || []).filter((l) => l.menu_id === id).reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="space-y-6">
      {CATS.map((c) => {
        const list = items.filter((i) => (i.category || "food") === c.key);
        if (list.length === 0) return null;
        return (
          <section key={c.key}>
            <h3 className="mb-2 text-sm font-bold text-muted-foreground">{c.label}</h3>
            <div className="space-y-3">
              {list.map((item) => {
                const qty = qtyOf(item.id);
                return (
                  <div key={item.id} className="flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-sm">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fittingType="fill" className="h-20 w-20 shrink-0 rounded-xl" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-3xl">🍽️</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight">{item.name}</p>
                      {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
                      <p className="mt-1 text-sm font-bold text-primary">฿{item.price}</p>
                      <button
                        onClick={() => onCustomize(item)}
                        className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-primary"
                      >
                        <SlidersHorizontal className="h-3 w-3" /> แต่งเมนู (หวาน/เผ็ด/โน้ต)
                      </button>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {qty > 0 && (
                        <button
                          onClick={() => onDecrement(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border active:scale-90 transition"
                          aria-label={`ลด ${item.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                      {qty > 0 && <span className="w-5 text-center text-sm font-bold">{qty}</span>}
                      <button
                        onClick={() => onQuickAdd(item)}
                        className="flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground active:scale-90 transition"
                        aria-label={`เพิ่ม ${item.name}`}
                      >
                        <Plus className="h-4 w-4" /> เพิ่ม
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {items.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          ร้านยังไม่ได้เพิ่มเมนูอาหาร ลองใหม่อีกครั้งนะ
        </div>
      )}
    </div>
  );
}