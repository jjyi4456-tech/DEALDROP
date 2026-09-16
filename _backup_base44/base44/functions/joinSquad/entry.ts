import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// "Squad กินแหลก" — a friend joins an existing recruiting squad via its share
// code. Service role is used so a non-member can be added without RLS getting
// in the way (the squad is only readable once you're a member).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const code = body?.squad_code;
    if (!code) return Response.json({ error: "squad_code is required" }, { status: 400 });

    const squads = await base44.asServiceRole.entities.Squad.filter({ squad_code: code });
    const squad = squads[0];
    if (!squad) return Response.json({ error: "ไม่พบ Squad" }, { status: 404 });
    if (squad.status !== "recruiting") return Response.json({ error: "Squad ปิดรับสมาชิกแล้ว" }, { status: 400 });

    const members = squad.members || [];
    const memberNames = squad.member_names || [];
    if (!members.includes(user.id)) {
      if (members.length >= squad.required_count) {
        return Response.json({ error: "Squad เต็มแล้ว" }, { status: 400 });
      }
      members.push(user.id);
      memberNames.push(user.full_name || user.email || "เพื่อน");
      const status = members.length >= squad.required_count ? "ready" : "recruiting";
      await base44.asServiceRole.entities.Squad.update(squad.id, { members, member_names: memberNames, status });
    }

    return Response.json({ ok: true, squad_id: squad.id, status: members.length >= squad.required_count ? "ready" : "recruiting" });
  } catch (error) {
    console.error("joinSquad error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}