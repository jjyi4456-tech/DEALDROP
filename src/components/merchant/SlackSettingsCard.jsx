import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, ExternalLink, Send } from "lucide-react";

// Lets a merchant connect their own Slack channel via an Incoming Webhook URL.
// The URL is stored on the Merchant record and used by the check-in + expiry
// Slack notification workflows. Each merchant connects their own Slack.
export default function SlackSettingsCard({ merchantId, webhookUrl }) {
  const [url, setUrl] = useState(webhookUrl || "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    if (!merchantId) {
      toast({ title: "ยังไม่มีข้อมูลร้าน", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Merchant.update(merchantId, { slack_webhook_url: url.trim() });
      toast({ title: "บันทึก Webhook Slack แล้ว" });
    } catch (e) {
      toast({ title: "บันทึกไม่สำเร็จ", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!url.trim()) {
      toast({ title: "กรุณาใส่ Webhook URL ก่อน", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      // no-cors + text/plain avoids a CORS preflight; Slack still parses the JSON body.
      await fetch(url.trim(), {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          text: "✅ ทดสอบการเชื่อมต่อ Slack จาก DEALDROP — ร้านค้าจะได้รับแจ้งเตือนเช็คอินและใกล้หมดอายุแพ็กเกจที่นี่",
        }),
      });
      toast({ title: "ส่งข้อความทดสอบแล้ว", description: "ตรวจสอบในแชนแนล Slack ของคุณ" });
    } catch (e) {
      toast({ title: "ส่งไม่สำเร็จ", description: "ตรวจสอบ Webhook URL อีกครั้ง", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mt-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <MessageSquare className="h-4 w-4 text-primary" /> เชื่อมต่อ Slack สำหรับร้านนี้
      </div>
      <p className="text-xs text-muted-foreground">
        รับแจ้งเตือนทันทีเมื่อมีลูกค้าเช็คอินสำเร็จ และเมื่อแพ็กเกจใกล้หมดอายุ ไปยังแชนแนล Slack ของคุณ
      </p>

      <div className="mt-3 space-y-1.5">
        <Label htmlFor="slack-webhook">Slack Incoming Webhook URL</Label>
        <Input
          id="slack-webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={saving} className="bg-primary">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังบันทึก...
            </>
          ) : (
            "บันทึก Webhook"
          )}
        </Button>
        <Button onClick={test} disabled={testing} variant="outline">
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังส่ง...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" /> ทดสอบส่งข้อความ
            </>
          )}
        </Button>
        <a
          href="https://api.slack.com/messaging/webhooks"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          วิธีสร้าง Webhook <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}