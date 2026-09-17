import { base44 } from "@/api/base44Client";
import { MERCHANT_TERMS_VERSION } from "@/lib/legalContent";

/**
 * Handle merchant application directly against Supabase database.
 * Creates/updates Merchant record with status 'pending'
 * and sets User role to 'pending_merchant'.
 */
export async function applyMerchantDirect({ name, category = "cafe", phone = "", address = "", owner_name = "" }) {
  if (!name || !name.trim()) {
    throw new Error("กรุณากรอกชื่อร้านค้า");
  }

  const me = await base44.auth.me().catch(() => null);
  if (!me?.id) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนส่งคำขอ");
  }

  // 1. Check if user already submitted a merchant record
  const existing = await base44.entities.Merchant.filter({ created_by_id: me.id }, "-created_date", 1).catch(() => []);
  let merchantRecord = null;

  const merchantData = {
    name: name.trim(),
    category: category || "cafe",
    phone: phone?.trim() || "",
    address: address?.trim() || "",
    owner_name: owner_name?.trim() || me.name || me.email?.split("@")[0] || "",
    email: me.email || "",
    created_by_id: me.id,
    status: "pending", // Waiting for admin approval!
    tier: "starter",
    is_pro: false,
    commission_rate: 0.06,
    xp_reward: 50,
    wallet_balance: 0,
    updated_at: new Date().toISOString(),
  };

  if (existing && existing.length > 0) {
    merchantRecord = await base44.entities.Merchant.update(existing[0].id, merchantData);
  } else {
    merchantRecord = await base44.entities.Merchant.create({
      ...merchantData,
      created_date: new Date().toISOString(),
    });
  }

  // 2. Set User role to pending_merchant so they are blocked from merchant dashboard & user dashboard until admin approves
  try {
    await base44.entities.User.update(me.id, {
      role: "pending_merchant",
    });
  } catch (err) {
    try {
      await base44.entities.User.create({
        id: me.id,
        email: me.email || "",
        name: owner_name || me.name || me.email?.split("@")[0] || "Merchant",
        role: "pending_merchant",
        created_at: new Date().toISOString(),
      });
    } catch (createErr) {
      console.warn("Could not update/create user role to pending_merchant:", createErr);
    }
  }

  // 3. Log legal agreement consent record
  await base44.entities.LegalConsentLog.create({
    user_id: me.id,
    document_type: "merchant_agreement",
    version: MERCHANT_TERMS_VERSION,
    merchant_id: merchantRecord?.id || null,
    merchant_name: name.trim(),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "web",
    accepted_at: new Date().toISOString(),
  }).catch((err) => console.warn("LegalConsentLog warning:", err));

  return {
    success: true,
    merchant: merchantRecord,
  };
}
