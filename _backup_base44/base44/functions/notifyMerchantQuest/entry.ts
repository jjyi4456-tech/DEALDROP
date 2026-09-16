import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { sendQuestAlert } from "../../shared/questEmail.ts";

// Sends a Gmail notification to a quest's merchant about a quota-full event.
// Invoked by the "Quest Quota Alert" workflow entity trigger.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const questId = body?.quest_id;
    const reason = body?.reason || "quota_full";
    if (!questId) return Response.json({ error: "quest_id is required" }, { status: 400 });

    const quest = await base44.asServiceRole.entities.Quest.get(questId).catch(() => null);
    if (!quest) return Response.json({ error: "quest not found" }, { status: 404 });

    const result = await sendQuestAlert(base44, quest, reason);
    return Response.json({ quest_id: questId, reason, result });
  } catch (error) {
    console.error("notifyMerchantQuest error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}