// Shared helpers for the "Cafe Mayor" (เจ้าถิ่นประจำร้าน) feature.
// The mayor badge is stored per-merchant on the User.badges array as `mayor:<merchantId>`.

export const mayorBadgeKey = (merchantId: string): string => `mayor:${merchantId}`;

// Award the mayor badge to a user (idempotent).
export async function addMayorBadge(sr: any, userId: string, merchantId: string) {
  const key = mayorBadgeKey(merchantId);
  const u = await sr.entities.User.get(userId);
  const cur = Array.isArray(u?.badges) ? u.badges : [];
  if (!cur.includes(key)) {
    await sr.entities.User.update(userId, { badges: [...cur, key] });
  }
}

// Remove the mayor badge from a user (idempotent).
export async function removeMayorBadge(sr: any, userId: string, merchantId: string) {
  const key = mayorBadgeKey(merchantId);
  const u = await sr.entities.User.get(userId);
  const cur = Array.isArray(u?.badges) ? u.badges : [];
  const next = cur.filter((b: string) => b !== key);
  if (next.length !== cur.length) {
    await sr.entities.User.update(userId, { badges: next });
  }
}