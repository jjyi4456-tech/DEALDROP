// Shared helpers for sending quest notification emails via the Gmail connector.
const GMAIL_SEND = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

function toB64(bytes: Uint8Array | number[]) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64url(s: string) {
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeHeader(str: string) {
  return `=?utf-8?B?${toB64(new TextEncoder().encode(str))}?=`;
}

// Send one email through the connected Gmail account. Returns { ok, id?, error? }.
export async function sendGmail(
  accessToken: string,
  toEmail: string,
  toName: string,
  subject: string,
  html: string
) {
  const to = toName ? `${encodeHeader(toName)} <${toEmail}>` : toEmail;
  const subjectH = encodeHeader(subject);
  const bodyB64 = toB64(new TextEncoder().encode(html));
  const mime = [
    `To: ${to}`,
    `Subject: ${subjectH}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    bodyB64,
  ].join("\r\n");
  const raw = b64url(btoa(mime));
  const res = await fetch(GMAIL_SEND, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    return { ok: false, error: `Gmail ${res.status}: ${await res.text()}` };
  }
  const data = await res.json();
  return { ok: true, id: data.id };
}

function wrap(head: string, lines: string[]) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;color:#1f2937">
    <div style="background:#FF7A00;padding:20px 24px;border-radius:12px 12px 0 0;color:#fff">
      <h2 style="margin:0;font-size:18px">${head}</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 12px 12px;line-height:1.6">
      ${lines.join("")}
      <p style="color:#6b7280;font-size:13px;margin-top:24px;margin-bottom:0">— ทีม DEALDROP</p>
    </div>
  </div>`;
}

function template(quest: any, merchant: any, reason: string) {
  const title = quest.title || "ภารกิจ";
  const shop = merchant?.name || "ร้านค้า";
  if (reason === "quota_full") {
    const cap = quest.capacity || 0;
    return {
      subject: `🎯 ภารกิจ "${title}" ครบโควตาแล้ว`,
      html: wrap("🎯 ภารกิจครบโควตาแล้ว", [
        `<p>สวัสดีคุณ <b>${shop}</b>,</p>`,
        `<p>ภารกิจ <b>"${title}"</b> มีผู้เข้าร่วมครบตามจำนวนที่รองรับแล้ว (<b>${cap}/${cap}</b> สิทธิ์)</p>`,
        `<p>คุณสามารถเตรียมการบริการ หรือพิจารณาเพิ่มจำนวนสิทธิ์ในระบบหากต้องการรับลูกค้าเพิ่ม</p>`,
      ]),
    };
  }
  return {
    subject: `⏰ ภารกิจ "${title}" จะสิ้นสุดวันนี้`,
    html: wrap("⏰ ภารกิจจะสิ้นสุดวันนี้", [
      `<p>สวัสดีคุณ <b>${shop}</b>,</p>`,
      `<p>ภารกิจ <b>"${title}"</b> จะสิ้นสุดในวันนี้ (<b>${quest.quest_date || "—"}</b>) เวลา <b>${quest.end_time || "—"}</b></p>`,
      `<p>แนะนำให้ตรวจสอบผู้เข้าร่วมและเตรียมรับลูกค้าที่จะมาใช้สิทธิ์ หากยังมีโควตาเหลือ สามารถกระตุ้นเพิ่มผ่าน Push หรือโปรโมชันได้</p>`,
    ]),
  };
}

// Fetch the merchant, compose the message, and send via Gmail.
export async function sendQuestAlert(base44: any, quest: any, reason: string) {
  if (!quest?.merchant_id) return { ok: false, error: "quest has no merchant" };
  const merchant = await base44.asServiceRole.entities.Merchant.get(quest.merchant_id).catch(() => null);
  if (!merchant || !merchant.email) return { ok: false, error: "merchant has no email" };
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");
  const { subject, html } = template(quest, merchant, reason);
  return await sendGmail(accessToken, merchant.email, merchant.name, subject, html);
}