import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Merchant sign-up (Role Assignment at Sign-up, step 2).
// Called right after a freshly-verified user fills in their shop info.
// Creates a pending Merchant record owned by the caller, then elevates the
// caller's role to pending_merchant. role is a built-in user field and cannot
// be self-set via updateMe, so this runs the role change as the service role.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role === 'admin') return Response.json({ error: 'Admin ไม่สามารถสมัครพาร์ทเนอร์ได้' }, { status: 403 });
    if (user.role === 'merchant' || user.role === 'pending_merchant') {
      return Response.json({ error: 'คุณเป็นพาร์ทเนอร์อยู่แล้ว' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const category = String(body?.category || 'restaurant').trim();
    const phone = String(body?.phone || '').trim();
    if (!name) return Response.json({ error: 'กรุณากรอกชื่อร้าน' }, { status: 400 });

    // Merchant record owned by the caller (created_by_id = caller), pending approval.
    await base44.entities.Merchant.create({
      name,
      category,
      status: 'pending',
      owner_name: user.full_name || '',
      email: user.email || '',
      phone,
      tier: 'starter',
    });

    // Elevate role to pending_merchant (service role; built-in field).
    await base44.asServiceRole.entities.User.update(user.id, { role: 'pending_merchant' });

    return Response.json({ ok: true, role: 'pending_merchant' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}