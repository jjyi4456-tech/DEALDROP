import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/shared/ImageUpload";

const CATS = [
  { value: "food", label: "🍜 อาหาร" },
  { value: "beverage", label: "🧋 เครื่องดื่ม" },
  { value: "dessert", label: "🍰 ของหวาน" },
];
const EMPTY = { name: "", price: "", category: "food", description: "", image_url: "", available: true };

export default function MenuItemForm({ open, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : EMPTY);
  }, [open, initial]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({ ...form, price: Number(form.price) || 0 });
    } finally {
      setSaving(false);
    }
  };

  const valid = form.name.trim() !== "" && form.price !== "" && Number(form.price) >= 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ImageUpload
            value={form.image_url}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            aspect="video"
            className="w-full"
          />
          <div className="space-y-1.5">
            <Label>ชื่อเมนู</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="เช่น ก๋วยเตี๋ยวต้มยำ" />
          </div>
          <div className="space-y-1.5">
            <Label>ราคา (บาท)</Label>
            <Input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="60" />
          </div>
          <div className="space-y-1.5">
            <Label>หมวดเมนู</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>รายละเอียด (ไม่บังคับ)</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="เช่น เผ็ดน้อย-เผ็ดมาก เพิ่มเนื้อพิเศษได้"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">ขายอยู่</p>
              <p className="text-xs text-muted-foreground">ปิดชั่วคราวเพื่อซ่อนจากหน้าสั่งอาหาร</p>
            </div>
            <Switch checked={form.available} onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit} disabled={saving || !valid}>
            {saving ? "กำลังบันทึก..." : initial ? "บันทึกการแก้ไข" : "เพิ่มเมนู"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}