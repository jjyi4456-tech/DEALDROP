import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from "base44:runtime";
import { loadOwnedMerchant, stripeHeaders, findCustomerByEmail } from "../../shared/stripeCustomer.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const merchantId = String(body?.merchant_id || "").trim();
    if (!merchantId) return Response.json({ error: "merchant_id is required" }, { status: 400 });

    const { merchant } = await loadOwnedMerchant(base44, merchantId);
    const headers = stripeHeaders();
    const customer = await findCustomerByEmail(merchant.email, headers);
    if (!customer) return Response.json({ has_customer: false, invoices: [], subscription: null });

    const invRes = await fetch(
      `https://api.stripe.com/v1/invoices?customer=${customer.id}&limit=10`,
      { headers }
    );
    const invData = await invRes.json();
    const invoices = (invData.data || []).map((i) => ({
      id: i.id,
      number: i.number,
      amount_due: i.amount_due,
      amount_paid: i.amount_paid,
      currency: i.currency,
      status: i.status,
      created: i.created,
      invoice_pdf: i.invoice_pdf,
    }));

    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=all&limit=5`,
      { headers }
    );
    const subData = await subRes.json();
    const subs = subData.data || [];
    const activeSub = subs.find((s) => s.status === "active") || subs[0] || null;
    const subscription = activeSub ? {
      id: activeSub.id,
      status: activeSub.status,
      current_period_end: activeSub.current_period_end,
      cancel_at_period_end: activeSub.cancel_at_period_end,
      plan_amount: activeSub.plan?.amount,
      plan_currency: activeSub.plan?.currency,
      plan_interval: activeSub.plan?.interval,
    } : null;

    return Response.json({ has_customer: true, customer_id: customer.id, invoices, subscription });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}