import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { currentWindowIndex, signWindow, makeToken, QR_WINDOW_MS } from "../../shared/liveQr.ts";

// Mints the merchant's current Dynamic QR token (HMAC-SHA256, time-windowed).
// Only the merchant owner (or an admin) may mint tokens for a merchant.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const merchantId = body?.merchant_id;
    if (!merchantId) return Response.json({ error: "merchant_id is required" }, { status: 400 });

    const merchant = await base44.entities.Merchant.get(merchantId).catch(() => null);
    if (!merchant) return Response.json({ error: "merchant not found" }, { status: 404 });
    if (merchant.created_by_id !== user.id && user.role !== "admin") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const secret = secrets.get("LIVE_QR_HMAC_SECRET");
    const windowIndex = currentWindowIndex();
    const token = makeToken(merchantId, windowIndex, await signWindow(merchantId, windowIndex, secret));

    return Response.json({
      merchant_id: merchantId,
      merchant_name: merchant.name,
      token,
      window_index: windowIndex,
      window_ms: QR_WINDOW_MS,
      issued_at: Date.now(),
      server_time: Date.now(),
      expires_at: (windowIndex + 1) * QR_WINDOW_MS,
    });
  } catch (error) {
    console.error("generateLiveQrToken error:", error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}