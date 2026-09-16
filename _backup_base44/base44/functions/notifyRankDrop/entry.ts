import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const checkinId = body.checkin_id;
    if (!checkinId) return Response.json({ error: 'checkin_id required' }, { status: 400 });

    const sr = base44.asServiceRole;
    let checkin = null;
    try {
      const checkins = await sr.entities.CheckIn.filter({ id: checkinId });
      checkin = checkins[0];
    } catch { /* invalid/missing id */ }
    if (!checkin) return Response.json({ notified: 0 });

    let checker = null;
    try { checker = await sr.entities.User.get(checkin.user_id); } catch { /* ignore */ }
    if (!checker) return Response.json({ notified: 0 });

    const checkerXp = checker.xp || 0;
    const gained = checkin.xp_earned || 0;
    if (gained <= 0) return Response.json({ notified: 0 });

    // users whose xp now falls in [checkerXp - gained, checkerXp) were just overtaken
    const overtaken = await sr.entities.User.filter(
      { xp: { $gte: checkerXp - gained, $lt: checkerXp } },
      '-xp', 50
    );

    let notified = 0;
    for (const u of overtaken) {
      if (u.id === checker.id) continue;
      try {
        await sr.integrations.Core.SendPushNotification({
          user_id: u.id,
          title: 'ระวัง! มีคนแซงอันดับคุณ',
          content: 'มีผู้เล่นแซงอันดับคุณไปแล้ว รีบไปทำภารกิจที่ร้าน F&B ใกล้คุณด่วน!',
          action_label: 'ดูกระดาน',
          action_url: '/user/leaderboard',
        });
        notified++;
      } catch { /* push needs native mobile build; ignore if unavailable */ }
    }
    return Response.json({ notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}