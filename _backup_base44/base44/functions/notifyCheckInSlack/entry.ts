/// <reference path="../../base44-env.d.ts" />
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { postToSlack } from "../../shared/slackWebhook.ts";

// Posts a Slack message to the check-in merchant's webhook when a CheckIn is
// created. Invoked by the "Check-in Slack Notify" entity-triggered workflow.
export default async function(req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const checkinId = String(body?.checkin_id || "").trim();
    if (!checkinId) return Response.json({ error: "checkin_id is required" }, { status: 400 });

    const checkin = await base44.asServiceRole.entities.CheckIn.get(checkinId).catch(() => null);
    if (!checkin) return Response.json({ error: "checkin not found" }, { status: 404 });

    const [merchant, quest] = await Promise.all([
      checkin.merchant_id ? base44.asServiceRole.entities.Merchant.get(checkin.merchant_id).catch(() => null) : null,
      checkin.quest_id ? base44.asServiceRole.entities.Quest.get(checkin.quest_id).catch(() => null) : null,
    ]);

    const webhookUrl = merchant?.slack_webhook_url;
    if (!webhookUrl) return Response.json({ skipped: true, reason: "no_slack_webhook" });

    const questTitle = quest?.title || checkin.quest_title || "ภารกิจ";
    const time = new Date(checkin.created_date || Date.now()).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      dateStyle: "short",
      timeStyle: "short",
    });
    const shop = merchant?.name || checkin.merchant_name || "ร้านค้า";
    const text =
      `🛎️ แจ้งเตือนเช็คอินสำเร็จ\n` +
      `ร้าน: ${shop}\n` +
      `ภารกิจ: ${questTitle}\n` +
      `XP ที่ได้: +${checkin.xp_earned ?? 50}\n` +
      `เวลา: ${time}\n` +
      `— DEALDROP`;

    const result = await postToSlack(webhookUrl, text);
    return Response.json({ checkin_id: checkinId, result });
  } catch (error: any) {
    console.error("notifyCheckInSlack error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}