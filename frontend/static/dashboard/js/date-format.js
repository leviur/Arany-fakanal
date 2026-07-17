/**
 * Közös dátumformázás — Rendelések + Foglalások dashboard.
 *
 * Naptári dátum:  2026. júl. 10.
 * Időbélyeg:      2026.07.09 22:34
 * Relatív idő:    5 perce / 2 órája / 3 napja
 */

const MONTH_LABELS = [
  "jan.", "feb.", "már.", "ápr.", "máj.", "jún.",
  "júl.", "aug.", "szept.", "okt.", "nov.", "dec.",
];

/* 2026-07-10 -> 2026.07.10 22:34*/
function formatHuDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** (2026-07-10) átalakít -> 2026. júl. 10*/
function formatHuDate(isoDate) {
  if (!isoDate) return "";
  const normalized = String(isoDate).trim().replace(/\./g, "-");
  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${year}. ${MONTH_LABELS[month - 1]} ${day}.`;
}

// „2026.07.09 22:34” szövegből: hány perc telt el a leadás óta (SLA, relatív idő)
function getMinutesFromOrderTime(timeText) {
  if (!timeText) return 0;

  const [datePart, timePart] = timeText.split(" ");
  if (!datePart || !timePart) return 0;

  const [y, m, d] = datePart.split(".").map(Number);
  const [h, min] = timePart.split(":").map(Number);

  const orderDate = new Date(y, m - 1, d, h, min, 0);

  return Math.floor((Date.now() - orderDate.getTime()) / 60000);
}

// Emberi olvasható idő — táblázat + teendők (perc → óra → nap)
function relativeTime(dateStr) {
  if (!dateStr) return "";
  const mins = getMinutesFromOrderTime(dateStr);
  if (mins < 1) return "most";
  if (mins < 60) return `${mins} perce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} órája`;
  return `${Math.floor(hrs / 24)} napja`;
}

// Teendő SLA szöveg: pl. „Új: 1 órája (limit: 30 perc)”
function formatSlaTodoReason(status, createdAtHu, limitMinutes) {
  const rel = relativeTime(createdAtHu);
  return `${status}: ${rel} (limit: ${limitMinutes} perc)`;
}

window.formatHuDateTime = formatHuDateTime;
window.formatHuDate = formatHuDate;
window.getMinutesFromOrderTime = getMinutesFromOrderTime;
window.relativeTime = relativeTime;
window.formatSlaTodoReason = formatSlaTodoReason;