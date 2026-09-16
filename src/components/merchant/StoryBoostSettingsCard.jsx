import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Loader2, Instagram, Music2 } from "lucide-react";

const PRESETS = [5, 10, 15];

// 📸 IG & TikTok Story Multiplier: the shop links its social accounts and can
// reward customers who post an IG/TikTok story tagging the shop with an extra
// discount on their bill.
export default function StoryBoostSettingsCard({ merchant }) {
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [percent, setPercent] = useState(5);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!merchant) return;
    setInstagram(merchant.instagram || "");
    setTiktok(merchant.tiktok || "");
    setEnabled(!!merchant.story_boost_enabled);
    setPercent(merchant.story_boost_percent != null ? merchant.story_boost_percent : 5);
  }, [merchant?.id]);

  if (!merchant) return null;

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Merchant.update(merchant.id, {
        instagram: instagram.trim(),
        tiktok: tiktok.trim(),
        story_boost_enabled: enabled,
        story_boost_percent: percent,
      });
      toast({
        title: "บันทึกการตั้งค่า Story Boost แล้ว",
        description: enabled
          ? `ลูกค้าที่แชร์สตอรี่แท็กร้านจะได้ส่วนลดเพิ่ม ${percent}% ทันที`
          : "ปิดรับสิทธิ์แชร์สตอรี่แล้ว",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white">
          <Camera className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-bold">📸 IG & TikTok Story Multiplier</h3>
          <p className="text-xs text-muted-foreground">เปลี่ยนลูกค้าเป็น Micro-Influencer แชร์สตอรี่แท็กร้านแลกส่วนลดเพิ่ม</p>
        </div>
      </div>

      {/* Social accounts */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sb-ig"><Instagram className="mr-1 inline h-3.5 w-3.5 text-fuchsia-600" /> Instagram Account</Label>
          <Input id="sb-ig" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@slowbar_cafe" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sb-tt"><Music2 className="mr-1 inline h-3.5 w-3.5 text-purple-600" /> TikTok Account</Label>
          <Input id="sb-tt" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@slowbar_official" />
        </div>
      </div>

      {/* Story boost switch */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-fuchsia-50/60 p-3.5">
        <div className="pr-3">
          <p className="text-sm font-semibold">เปิดรับสิทธิ์แชร์สตอรี่เพื่อรับส่วนลดเพิ่ม</p>
          <p className="text-xs text-muted-foreground">แคชเชียร์จะติ๊กยืนยันเมื่อลูกค้าโชว์สตอรี่ที่แท็กร้านตอนจ่ายบิล</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Extra discount presets */}
      {enabled && (
        <div className="mt-3 space-y-1.5">
          <Label>ส่วนลดเพิ่มเติมสำหรับลูกค้าที่แชร์สตอรี่</Label>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPercent(p)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
                  percent === p ? "bg-fuchsia-600 text-white shadow" : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                ลดเพิ่ม {p}%
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">หรือใช้เป็นสิทธิ์ท็อปปิ้งฟรีแทนได้ตามที่ตกลงกับลูกค้าหน้าร้าน</p>
        </div>
      )}

      <Button onClick={save} disabled={saving} className="mt-4 w-full bg-fuchsia-600 text-white hover:bg-fuchsia-700">
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...</> : "บันทึกการตั้งค่าสตอรี่"}
      </Button>
    </div>
  );
}