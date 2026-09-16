import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function EditProfileSheet({ open, onOpenChange, user, onSaved }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      await base44.auth.updateMe({ phone: form.phone });
      toast({ title: "บันทึกข้อมูลเรียบร้อยแล้ว", description: "ข้อมูลส่วนตัวของคุณถูกอัปเดตแล้ว" });
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>แก้ไขข้อมูลส่วนตัว</SheetTitle>
          <SheetDescription>อัปเดตข้อมูลที่ใช้แสดงบนโปรไฟล์นักล่าของคุณ</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">ชื่อ-นามสกุล</Label>
            <Input id="ep-name" value={form.full_name} onChange={set("full_name")} placeholder="ชื่อของคุณ" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-phone">เบอร์โทรศัพท์</Label>
            <Input id="ep-phone" value={form.phone} onChange={set("phone")} placeholder="08x-xxx-xxxx" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-email">อีเมล</Label>
            <Input id="ep-email" type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" />
          </div>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="mt-6 h-12 w-full text-base font-semibold"
        >
          {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังบันทึก...</> : "บันทึกข้อมูล"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}