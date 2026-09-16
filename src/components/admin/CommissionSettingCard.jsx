import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

// Admin setting: platform commission percentage taken from each customer's bill.
// The value is stored once in PlatformConfig and can be changed anytime.
export default function CommissionSettingCard() {
  const [configId, setConfigId] = useState(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.PlatformConfig.list()
      .then((list) => {
        if (list.length > 0) {
          setConfigId(list[0].id);
          setValue(String(list[0].commission_percent ?? 0));
        } else {
          setValue("0");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const parsed = Number(value);
    if (value === "" || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast({ title: "กรุณากรอกค่าระหว่าง 0-100", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (configId) {
        await base44.entities.PlatformConfig.update(configId, { commission_percent: parsed });
      } else {
        const created = await base44.entities.PlatformConfig.create({ commission_percent: parsed });
        setConfigId(created.id);
      }
      toast({ title: "บันทึกส่วนแบ่งรายได้เรียบร้อยแล้ว" });
    } catch (e) {
      toast({ title: "บันทึกไม่สำเร็จ ลองอีกครั้ง", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Percent className="h-4 w-4" />
        </div>
        <h3 className="font-semibold">ส่วนแบ่งรายได้แพลตฟอร์ม</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        กำหนดเปอร์เซ็นต์ที่แพลตฟอร์มหักจากยอดบิลของลูกค้าแต่ละออเดอร์ — ปรับได้ตลอดเวลา
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          step="0.5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          className="w-28"
        />
        <span className="text-sm font-medium text-muted-foreground">%</span>
        <Button onClick={save} disabled={loading || saving} className="ml-auto">
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}