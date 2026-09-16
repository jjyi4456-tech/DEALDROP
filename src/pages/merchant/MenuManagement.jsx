import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Image } from "@/components/ui/image";
import MenuItemForm from "@/components/merchant/MenuItemForm";
import { Plus, Pencil, Trash2, UtensilsCrossed } from "lucide-react";

const CAT_LABEL = { food: "🍜 อาหาร", beverage: "🧋 เครื่องดื่ม", dessert: "🍰 ของหวาน" };

export default function MenuManagement() {
  const [merchant, setMerchant] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const me = await base44.auth.me().catch(() => null);
      const list = await base44.entities.Merchant.list();
      const m = (me && list.find((x) => x.created_by_id === me.id)) || list[0] || null;
      setMerchant(m);
      if (m) setItems(await base44.entities.MenuItem.filter({ merchant_id: m.id }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (data) => {
    const payload = {
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      image_url: data.image_url,
      available: data.available,
    };
    if (editing?.id) {
      await base44.entities.MenuItem.update(editing.id, payload);
      toast({ title: "แก้ไขเมนูเรียบร้อย", description: `${data.name} อัปเดตแล้ว` });
    } else {
      await base44.entities.MenuItem.create({ ...payload, merchant_id: merchant.id, merchant_name: merchant.name });
      toast({ title: "เพิ่มเมนูใหม่เรียบร้อย", description: `${data.name} ไปปรากฏบนหน้าสั่งอาหารของลูกค้าแล้ว` });
    }
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const toggleAvailable = async (item) => {
    await base44.entities.MenuItem.update(item.id, { available: !item.available });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: !item.available } : i)));
  };

  const remove = async (item) => {
    await base44.entities.MenuItem.delete(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "ลบเมนูแล้ว", description: `${item.name} ถูกลบออกจากรายการแล้ว` });
  };

  return (
    <div>
      <PageHeader
        title="จัดการเมนูอาหาร"
        subtitle="เพิ่มหรือแก้ไขเมนูที่ลูกค้าเห็นบนหน้าสั่งอาหาร"
        action={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> เพิ่มเมนู
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีเมนู — เพิ่มเมนูแรกให้ร้านของคุณ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
              {item.image_url ? (
                <Image src={item.image_url} alt={item.name} fittingType="fill" className="h-14 w-14 shrink-0 rounded-xl" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">🍽️</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="text-xs text-muted-foreground">{CAT_LABEL[item.category] || "🍜 อาหาร"} · ฿{item.price}</p>
              </div>
              <Switch checked={item.available !== false} onCheckedChange={() => toggleAvailable(item)} />
              <button onClick={() => { setEditing(item); setFormOpen(true); }} className="rounded-lg p-2 hover:bg-accent" aria-label={`แก้ไข ${item.name}`}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => remove(item)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`ลบ ${item.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Link to="/merchant/orders" className="block rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground transition hover:border-primary/40 hover:text-primary">
            ดูออเดอร์ที่ลูกค้าสั่ง →
          </Link>
        </div>
      )}

      <MenuItemForm
        open={formOpen}
        initial={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={submit}
      />
    </div>
  );
}