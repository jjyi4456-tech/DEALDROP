import { secrets } from "base44:runtime";

export async function loadOwnedMerchant(base44, merchantId) {
  const user = await base44.auth.me();
  if (!user) throw new Error("Unauthorized");
  const merchant = await base44.asServiceRole.entities.Merchant.get(merchantId);
  if (!merchant) throw new Error("Merchant not found");
  if (merchant.created_by_id !== user.id && user.role !== "admin") throw new Error("Forbidden");
  return { user, merchant };
}

export function stripeHeaders() {
  return {
    Authorization: `Bearer ${secrets.get("STRIPE_SECRET_KEY")}`,
    "Stripe-Version": "2025-10-29.clover",
  };
}

export async function findCustomerByEmail(email, headers) {
  if (!email) return null;
  const res = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
    { headers }
  );
  const data = await res.json();
  return (data.data && data.data[0]) || null;
}