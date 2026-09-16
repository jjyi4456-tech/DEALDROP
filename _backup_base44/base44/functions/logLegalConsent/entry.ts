import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

const TYPES = ["merchant_agreement", "privacy_policy", "receipt_processing", "cookie_consent"];

// Legal audit trail: records exactly who consented to which legal document,
// at what time, from which device. Records are immutable — only admins can
// update or delete them.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const document_type = String(body.document_type || "").trim();
    if (!TYPES.includes(document_type)) {
      return Response.json({ error: "document_type ไม่ถูกต้อง" }, { status: 400 });
    }

    const forwarded = req.headers.get("x-forwarded-for") || "";
    const log = await base44.entities.LegalConsentLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email || "",
      merchant_id: body.merchant_id ? String(body.merchant_id) : null,
      merchant_name: body.merchant_name ? String(body.merchant_name) : null,
      document_type,
      version: String(body.version || "v1.0"),
      accepted_at: new Date().toISOString(),
      ip_address: forwarded.split(",")[0]?.trim() || "",
      user_agent: req.headers.get("user-agent") || "",
    });

    return Response.json({ id: log.id, accepted_at: log.accepted_at, version: log.version });
  } catch (error) {
    console.error("logLegalConsent error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}