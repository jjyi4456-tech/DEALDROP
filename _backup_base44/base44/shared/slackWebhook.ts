// Shared helper for posting a message to a Slack Incoming Webhook URL.
// Used by check-in and subscription-expiry Slack notification functions.
// Incoming Webhooks need no OAuth token at send time, so they work from any
// execution context (entity-triggered or scheduled workflows).

// Slack Incoming Webhook URLs are user-supplied (Merchant.slack_webhook_url),
// so validate the destination before the server-side request: HTTPS only,
// exactly hooks.slack.com, under the /services/ path. Anything else is
// rejected (prevents SSRF to internal/attacker hosts).
export async function postToSlack(webhookUrl, text) {
  if (!webhookUrl) return { ok: false, error: "no_webhook_url" };
  let parsed;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    return { ok: false, error: "invalid_webhook_url" };
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "hooks.slack.com" ||
    !parsed.pathname.startsWith("/services/")
  ) {
    return { ok: false, error: "invalid_webhook_url" };
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: await res.text().catch(() => "") };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}