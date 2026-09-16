import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { loadOwnedMerchant, stripeHeaders, findCustomerByEmail } from "../../shared/stripeCustomer.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const merchantId = String(body?.merchant_id || "").trim();
    const returnUrl = String(body?.return_url || "https://hungry-quest-club.base44.app/merchant/billing").trim();
    if (!merchantId) return Response.json({ error: "merchant_id is required" }, { status: 400 });

    const { merchant } = await loadOwnedMerchant(base44, merchantId);
    const headers = stripeHeaders();
    const customer = await findCustomerByEmail(merchant.email, headers);
    if (!customer) {
      return Response.json(
        { error: "no_payment_history", reason: "ยังไม่มีประวัติการชำระบนระบบสมาชิก กรุณาสมัครแบบบัตรเครดิตก่อน" },
        { status: 404 }
      );
    }

    const params = new URLSearchParams();
    params.set("customer", customer.id);
    params.set("return_url", returnUrl);
    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
      body: params,
    });
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.error?.message || "stripe error" }, { status: 400 });
    return Response.json({ url: data.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}