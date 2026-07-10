/**
 * Közös dátumformázás — Rendelések + Foglalások dashboard.
 *
 * Naptári dátum:  2026. júl. 10.
 * Időbélyeg:      2026.07.09 22:34
 */

const MONTH_LABELS = [
  "jan.", "feb.", "már.", "ápr.", "máj.", "jún.",
  "júl.", "aug.", "szept.", "okt.", "nov.", "dec.",
];

function formatHuDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatHuDate(isoDate) {
  if (!isoDate) return "";
  const normalized = String(isoDate).trim().replace(/\./g, "-");
  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${year}. ${MONTH_LABELS[month - 1]} ${day}.`;
}

window.formatHuDateTime = formatHuDateTime;
window.formatHuDate = formatHuDate;
