// Shared Dynamic-QR token helpers — HMAC-SHA256 time-based tokens (Web Crypto API).
// Window = 15s. A token is valid for its own window plus one grace window
// (max age 30s), then it is dead. Used by generateLiveQrToken + secureCheckIn.

export const QR_WINDOW_MS = 15000;
export const TOKEN_GRACE_WINDOWS = 1;

export function currentWindowIndex(nowMs) {
  return Math.floor((nowMs || Date.now()) / QR_WINDOW_MS);
}

export async function signWindow(merchantId, windowIndex, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${merchantId}:${windowIndex}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function makeToken(merchantId, windowIndex, hmac) {
  return `${merchantId}.${windowIndex}.${hmac}`;
}

// Verify a dynamic QR token: signature + expiry. Never trusts client time.
export async function verifyToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const merchantId = parts[0];
  const windowIndex = Number(parts[1]);
  const hmac = parts[2];
  if (!merchantId || !Number.isInteger(windowIndex) || windowIndex < 0 || !/^[a-f0-9]{64}$/.test(hmac)) {
    return { ok: false, reason: "malformed" };
  }
  const now = currentWindowIndex();
  if (windowIndex > now) return { ok: false, reason: "invalid" };
  if (now - windowIndex > TOKEN_GRACE_WINDOWS) return { ok: false, reason: "expired" };
  const expected = await signWindow(merchantId, windowIndex, secret);
  if (expected !== hmac) return { ok: false, reason: "invalid" };
  return { ok: true, merchant_id: merchantId, window_index: windowIndex };
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}