import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { splitBill, resolveRate } from "../../shared/commission.ts";

const TX_TYPES = ["dine_in_bill", "voucher_purchase", "quest_boost", "season_pass", "addon_push"];

// SHA-256 of the receipt image bytes — catches the same photo re-uploaded
// under a different URL (duplicate-slip fraud).
async function hashReceipt(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

// Vision AI receipt audit: extracts merchant/date/total/bill number from the
// image, detects re-used slips, resolves the merchant's commission rate and
// stores the Transaction with the platform take already calculated.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const receiptUrl = String(body.receipt_image_url || "").trim();
    const type = TX_TYPES.includes(body.type) ? body.type : "dine_in_bill";
    if (!/^https?:\/\/.+/.test(receiptUrl)) {
      return Response.json({ error: "ต้องแนบรูปใบเสร็จก่อน (receipt_image_url)" }, { status: 400 });
    }

    // ---- Fraud check: duplicate receipt (hash first, URL as fallback) ----
    const receiptHash = await hashReceipt(receiptUrl);
    const dupFilter = receiptHash ? { receipt_hash: receiptHash } : { receipt_image_url: receiptUrl };
    const dups = await base44.asServiceRole.entities.Transaction.filter(dupFilter, "-created_date", 5);
    const isDuplicate = dups.length > 0;

    // ---- Vision AI extraction ----
    const ai = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        "You are a fintech receipt auditor for Thai restaurant receipts. Analyze the attached receipt image. " +
        "Extract the shop name, bill date (YYYY-MM-DD), bill/receipt number, and the grand total in THB. " +
        "If the image is not a receipt or bill, set is_receipt=false and confidence=0. " +
        "confidence is your certainty 0-100. " +
        "PRIVACY GUARDRAIL (Thai PDPA): You are processing personal data. NEVER transcribe or return " +
        "credit/debit card numbers (16-digit PANs or any card digits), cardholder names, national ID " +
        "numbers, customer names, or phone numbers — if such data appears on the receipt, ignore it " +
        "completely. Set card_data_detected=true if you notice any card number or other sensitive " +
        "personal data on the receipt, but never include the values themselves in any output field. " +
        "The bill_number field must be the receipt/document number printed by the shop, never a card number.",
      file_urls: [receiptUrl],
      response_json_schema: {
        type: "object",
        properties: {
          is_receipt: { type: "boolean" },
          merchant_name: { type: "string" },
          bill_date: { type: "string" },
          bill_number: { type: "string" },
          total_amount: { type: "number" },
          items_count: { type: "number" },
          confidence: { type: "number" },
          card_data_detected: { type: "boolean" },
        },
        required: ["is_receipt", "total_amount", "confidence"],
      },
    });

    const gross = Number(ai?.total_amount) || 0;
    const confidence = Math.max(0, Math.min(100, Number(ai?.confidence) || 0));

    // Auto-masking (defense in depth): even if the AI ignored the guardrail,
    // anything in bill_number that looks like a card PAN (12+ consecutive
    // digits) is discarded before storage — card data never reaches the DB.
    const rawBillNumber = String(ai?.bill_number || "").trim();
    const safeBillNumber = /\d{12,}/.test(rawBillNumber.replace(/[\s-]/g, "")) ? "" : rawBillNumber;

    // ---- Resolve the merchant (explicit id > AI name match) ----
    let merchant = null;
    if (body.merchant_id) {
      const found = await base44.asServiceRole.entities.Merchant.filter({ id: body.merchant_id }, "-created_date", 1);
      merchant = found[0] || null;
    } else if (ai?.merchant_name) {
      const all = await base44.asServiceRole.entities.Merchant.filter({}, "-created_date", 100);
      const needle = String(ai.merchant_name).trim().toLowerCase();
      merchant = all.find((m) => (m.name || "").toLowerCase().includes(needle)) || null;
    }

    // ---- Commission split ----
    const rate = await resolveRate(base44, merchant?.id);
    const split = splitBill(gross, rate);

    // Auto-verified only when AI is sure, it's really a receipt, amount > 0
    // and the slip has never been used before; anything else lands in pending
    // for the admin audit queue.
    const status =
      ai?.is_receipt && !isDuplicate && confidence >= 70 && gross > 0 ? "verified" : "pending";

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

    const tx = await base44.entities.Transaction.create({
      type,
      merchant_id: merchant?.id || null,
      merchant_name: merchant?.name || ai?.merchant_name || "ไม่ระบุร้าน",
      merchant_owner_id: merchant?.created_by_id || null,
      user_id: user.id,
      user_name: user.full_name || user.email,
      gross_amount: gross,
      platform_rate: split.platform_rate,
      platform_fee: split.platform_fee,
      gateway_fee: split.gateway_fee,
      net_merchant_amount: split.net_merchant_amount,
      status,
      payment_method: "receipt_scan",
      receipt_image_url: receiptUrl,
      receipt_hash: receiptHash,
      bill_number: safeBillNumber,
      transaction_date: ai?.bill_date && /^\d{4}-\d{2}-\d{2}$/.test(ai.bill_date) ? ai.bill_date : today,
      ai_verification_data: {
        is_receipt: Boolean(ai?.is_receipt),
        merchant_name: ai?.merchant_name || "",
        bill_date: ai?.bill_date || "",
        items_count: Number(ai?.items_count) || 0,
        confidence,
        is_duplicate: isDuplicate,
        card_data_detected: Boolean(ai?.card_data_detected),
      },
    });

    return Response.json({
      transaction_id: tx.id,
      status,
      gross_amount: gross,
      platform_rate: split.platform_rate,
      platform_fee: split.platform_fee,
      net_merchant_amount: split.net_merchant_amount,
      confidence,
      is_duplicate: isDuplicate,
    });
  } catch (error) {
    console.error("verifyReceiptAI error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}