/// <reference path="../../base44-env.d.ts" />
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { postToSlack } from "../../shared/slackWebhook.ts";

const WINDOW_DAYS = 7;

// Scans merchants whose subscription_expires_at falls within the next 7 days
// and posts a renewal reminder to each merchant's Slack webhook. Invoked daily
// by the "Subscription Expiry Slack" scheduled workflow.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const horizon = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const merchants = await base44.asServiceRole.entities.Merchant.filter({}, "-created_date", 500);
    const due = merchants.filter((m: any) => {
      if (!m.subscription_expires_at || !m.slack_webhook_url) return false;
      const exp = new Date(m.subscription_expires_at);
      if (isNaN(exp.getTime())) return false;
      return exp > now && exp <= horizon;
    });

    const results = [];
    for (const m of due) {
      const exp = new Date(m.subscription_expires_at);
      const expStr = exp.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
      const daysLeft = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      const text =
        `⏰ แพ็กเกจใกล้หมดอายุ\n` +
        `ร้าน: ${m.name || "—"}\n` +
        `แพ็กเกจ: ${m.tier || "—"}\n` +
        `หมดอายุใน ${daysLeft} วัน (${expStr})\n` +
        `กรุณาต่ออายุเพื่อใช้บริการต่ออย่างต่อเนื่อง\n` +
        `— DEALDROP`;
      const r = await postToSlack(m.slack_webhook_url, text);
      results.push({ merchant_id: m.id, name: m.name, days_left: daysLeft, ok: r.ok, error: r.error });
    }

    return Response.json({ scanned: due.length, window_days: WINDOW_DAYS, results });
  } catch (error: any) {
    console.error("scanSubscriptionExpirySlack error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}