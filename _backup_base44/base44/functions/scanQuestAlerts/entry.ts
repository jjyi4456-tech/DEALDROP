import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { sendQuestAlert } from "../../shared/questEmail.ts";

function bangkokToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Scans active quests whose quest_date is today (Bangkok) and emails each merchant
// an expiry warning. Invoked daily by the "Quest Expiry Scan" workflow.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const today = bangkokToday();
    const quests = await base44.asServiceRole.entities.Quest.filter({ status: "active" }, "-quest_date", 100);
    const due = quests.filter((q) => q.quest_date === today);

    const results = [];
    for (const q of due) {
      try {
        const r = await sendQuestAlert(base44, q, "expiring");
        results.push({ quest_id: q.id, title: q.title, ok: r.ok, error: r.error });
      } catch (e) {
        results.push({ quest_id: q.id, title: q.title, ok: false, error: e?.message || String(e) });
      }
    }
    return Response.json({ today, scanned: due.length, results });
  } catch (error) {
    console.error("scanQuestAlerts error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}