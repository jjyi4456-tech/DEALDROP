// Bangkok time helpers + Double Lock QR payload utilities

export const bkDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const bkTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

// A quest is "live now" only inside its scheduled Bangkok date/time window
export const isQuestLiveNow = (q) => {
  if (!q) return false;
  if (q.quest_date && q.quest_date !== bkDate()) return false;
  const now = bkTime();
  if (q.start_time && now < q.start_time) return false;
  if (q.end_time && now > q.end_time) return false;
  return true;
};

export const SHOP_QR_PREFIX = "hb:shop:";
export const shopQrPayload = (merchantId) => `${SHOP_QR_PREFIX}${merchantId}`;
export const parseShopQr = (text) => {
  if (!text) return null;
  const t = String(text).trim();
  if (t.startsWith(SHOP_QR_PREFIX)) return t.slice(SHOP_QR_PREFIX.length);
  return null;
};