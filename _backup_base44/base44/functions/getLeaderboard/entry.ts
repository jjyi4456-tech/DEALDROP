import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const titleOf = (xp) =>
  xp >= 5000 ? "เทพอาหาร" :
  xp >= 2000 ? "นักล่าระดับเซียน" :
  xp >= 500 ? "นักล่ามือฉมัง" :
  xp >= 100 ? "นักล่ามือใหม่" : "นักชิมมือใหม่";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const period = body.period || 'all';
    const sr = base44.asServiceRole;

    let entries = [];
    if (period === 'all') {
      const users = await sr.entities.User.filter({}, '-xp', 100);
      entries = users.map((u) => ({ id: u.id, name: u.full_name || 'นักชิม', avatar: u.avatar_url, xp: u.xp || 0 }));
    } else {
      const days = period === 'weekly' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      const checkins = await sr.entities.CheckIn.filter({ created_date: { $gte: cutoff } }, '-created_date', 2000);
      const map = {};
      for (const c of checkins) {
        if (!c.user_id) continue;
        map[c.user_id] = (map[c.user_id] || 0) + (c.xp_earned || 0);
      }
      const ids = Object.keys(map);
      if (ids.length) {
        const users = await sr.entities.User.filter({ id: { $in: ids } }, undefined, 100);
        const um = {};
        users.forEach((u) => { um[u.id] = u; });
        entries = ids.map((id) => ({ id, name: um[id]?.full_name || 'นักชิม', avatar: um[id]?.avatar_url, xp: map[id] }));
        entries.sort((a, b) => b.xp - a.xp);
        entries = entries.slice(0, 100);
      }
    }

    const top = entries.map((e, i) => ({ rank: i + 1, ...e, title: titleOf(e.xp) }));

    let me;
    const meEntry = top.find((t) => t.id === user.id);
    if (meEntry) {
      const above = top.find((t) => t.rank === meEntry.rank - 1);
      me = { rank: meEntry.rank, id: user.id, name: meEntry.name, xp: meEntry.xp, title: meEntry.title, gap: above ? above.xp - meEntry.xp : null, nextName: above?.name, nextRank: above?.rank };
    } else {
      const myXp = period === 'all' ? (user.xp || 0) : 0;
      let rank = top.length + 1;
      if (period === 'all') {
        const ahead = await sr.entities.User.filter({ xp: { $gt: myXp } }, undefined, 1000);
        rank = ahead.length + 1;
      }
      const above = top[top.length - 1];
      me = { rank, id: user.id, name: user.full_name || 'คุณ', xp: myXp, title: titleOf(myXp), gap: above ? above.xp - myXp : null, nextName: above?.name, nextRank: above?.rank };
    }

    let flash = { active: false, message: '' };
    try {
      const cfgs = await sr.entities.GamificationConfig.list(undefined, 1);
      const cfg = cfgs[0];
      if (cfg && cfg.double_xp_active) flash = { active: true, message: '🔥 Flash XP x2 กำลังจุดตอนนี้! รีบไปเช็คอินร้านใกล้คุณ' };
    } catch { /* ignore */ }

    return Response.json({ period, top, me, flash });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}