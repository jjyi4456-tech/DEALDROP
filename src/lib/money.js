// Money formatting helpers shared by the revenue & settlement dashboards.

export function formatTHB(n, decimals = 0) {
  return (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompactTHB(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) return `฿${(v / 1000000).toFixed(2)}M`;
  if (v >= 1000) return `฿${(v / 1000).toFixed(1)}K`;
  return `฿${v.toFixed(0)}`;
}

// "2026-08-01" → "1 ส.ค. 2569"
export function formatThaiDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}