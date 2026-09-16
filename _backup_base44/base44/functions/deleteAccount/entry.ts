import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Server-side account deletion for the calling user. RLS normally blocks users
// from deleting their own check-ins/coupons/etc., so the service role performs
// the deletion — but strictly scoped to records that belong to the
// authenticated caller (explicit user_id filters, nothing else).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = base44.asServiceRole;
    await admin.entities.CheckIn.deleteMany({ user_id: user.id });
    await admin.entities.Coupon.deleteMany({ user_id: user.id });
    await admin.entities.FoodieBuddy.deleteMany({ user_id: user.id });
    await admin.entities.UserInventory.deleteMany({ user_id: user.id });
    await admin.entities.MegaReward.deleteMany({ user_id: user.id });

    return Response.json({ ok: true, user_id: user.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}