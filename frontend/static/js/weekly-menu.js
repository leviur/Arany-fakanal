// ======================================================
// HETI MENÜ — főoldal (GET /api/weekly-menu/)
// A dashboard ugyanabból az adatbázisból tölt; itt a kosár nap-slugjai (hetfo, kedd, …) kellenek.
// ======================================================

const WEEKLY_MENU_API = "/api/weekly-menu/";
const DAY_SLUGS = ["hetfo", "kedd", "szerda", "csutortok", "pentek"];

// A kosár és a menü-megjelenítés ezt a tömböt használja (weekly_menu.json helyett)
window.weeklyMenuData = [];

/**
 * Az API konkrét dátumot küld (pl. "2026-07-07"), a kosár viszont napnevet vár
 * (pl. "hetfo", "kedd"). Ez a függvény átalakítja: megnézi, hány nappal van
 * a dátum a hét hétfője után, és visszaadja a megfelelő napnevet.
 *
 * Példa: hétfő = 2026-07-07
 *   dateToDayName("2026-07-07", "2026-07-07") → "hetfo"
 *   dateToDayName("2026-07-08", "2026-07-07") → "kedd"
 */
function dateToDayName(dateStr, weekMonday) {
  const day = new Date(`${dateStr}T12:00:00`);       // API-ból jövő dátum
  const monday = new Date(`${weekMonday}T12:00:00`); // a hét hétfője
  const diff = Math.round((day - monday) / 86400000);   // hány nap a hétfő után
  if (diff < 0 || diff > 4) return null;                // csak hétfő–péntek
  return DAY_SLUGS[diff];                               // 0=hetfo, 1=kedd, …
}

/**
 * Melyik hét menüjét kell betölteni — ugyanaz a logika, mint cart.js getAvailableOrderDays:
 * hétfő–csütörtök: aktuális hét; péntek–vasárnap: következő hét.
 */
function getOrderWeekMonday(referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(12, 0, 0, 0);
  const dow = today.getDay();

  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));

  if (dow === 5 || dow === 6 || dow === 0) {
    monday.setDate(monday.getDate() + 7);
  }

  return monday.toISOString().slice(0, 10);
}

function formatMenuDesc(menuItem) {
  if (!menuItem) return "Nem elérhető";
  const parts = [];
  if (menuItem.soup) parts.push(menuItem.soup.name);
  if (menuItem.main_course) parts.push(menuItem.main_course.name);
  if (menuItem.dessert) parts.push(menuItem.dessert.name);
  return parts.join(", ") || "Nem elérhető";
}

function isOrderableWeeklyMenu(menuItem) {
  return menuItem && menuItem.is_available !== false;
}

function updateMenuDisplay(dayValue) {
  const menuA = window.weeklyMenuData.find(
    (m) => m.day === dayValue && m.menu_type === "A" && isOrderableWeeklyMenu(m),
  );
  const menuB = window.weeklyMenuData.find(
    (m) => m.day === dayValue && m.menu_type === "B" && isOrderableWeeklyMenu(m),
  );

  const descA = document.getElementById("menuA-desc");
  const descB = document.getElementById("menuB-desc");
  if (!descA || !descB) return;

  descA.textContent = menuA ? formatMenuDesc(menuA) : "Ezen a napon nincs A menü.";
  descB.textContent = menuB ? formatMenuDesc(menuB) : "Ezen a napon nincs B menü.";
}

function resetMenuSelection() {
  const menuA = document.getElementById("menuA");
  const menuB = document.getElementById("menuB");
  if (menuA) menuA.checked = false;
  if (menuB) menuB.checked = false;
}

function resetDailyMenuForm() {
  if (typeof populateDaySelect === "function") {
    populateDaySelect();
  }
  resetMenuSelection();
  const daySelect = document.getElementById("day");
  if (daySelect?.value) {
    updateMenuDisplay(daySelect.value);
  }
}

function showWeeklyMenuLoadError() {
  const descA = document.getElementById("menuA-desc");
  const descB = document.getElementById("menuB-desc");
  if (descA) descA.textContent = "Nem sikerült betölteni.";
  if (descB) descB.textContent = "Nem sikerült betölteni.";
}

/** GET /api/weekly-menu/?week_start= — API válasz átalakítása a régi JSON formátumra */
async function loadWeeklyMenuFromApi() {
  const weekStart = getOrderWeekMonday();
  const response = await fetch(`${WEEKLY_MENU_API}?week_start=${weekStart}`);

  if (!response.ok) {
    throw new Error("Nem sikerült betölteni a heti menüt");
  }

  const data = await response.json();

  // Vendég oldal: csak rendelhető menük (is_available=true).
  // Admin bejelentkezve is ugyanígy — a backend adminnak mindent ad vissza,
  // de a rendelés űrlap vendéglogikát követ.
  window.weeklyMenuData = data
    .filter((item) => item.is_available !== false)
    .map((item) => {
      // item.day itt még dátum (pl. "2026-07-08") — átírjuk napnévre (pl. "kedd")
      const day = dateToDayName(item.day, weekStart);
      if (!day) return null;
      return { ...item, day };
    })
    .filter(Boolean);

  return window.weeklyMenuData;
}

/** Betöltés + UI frissítés — hívók: DOMContentLoaded, live-sync.js → onRevisionChanged() */
async function refreshWeeklyMenu() {
  await loadWeeklyMenuFromApi();

  if (typeof populateDaySelect === "function") {
    populateDaySelect();
  }

  const daySelect = document.getElementById("day");
  if (daySelect?.value) {
    updateMenuDisplay(daySelect.value);
  }

  if (typeof validateCartItems === "function") {
    validateCartItems({ silent: true });
  }
  if (typeof renderCart === "function") {
    renderCart();
  }
}

window.loadWeeklyMenuFromApi = loadWeeklyMenuFromApi;
window.refreshWeeklyMenu = refreshWeeklyMenu;
window.resetDailyMenuForm = resetDailyMenuForm;
window.updateMenuDisplay = updateMenuDisplay;

document.addEventListener("DOMContentLoaded", () => {
  const daySelect = document.getElementById("day");
  if (!daySelect) return;

  refreshWeeklyMenu().catch((err) => {
    console.error("Hiba a heti menü betöltésekor:", err);
    showWeeklyMenuLoadError();
  });

  daySelect.addEventListener("change", () => {
    resetMenuSelection();
    updateMenuDisplay(daySelect.value);
  });
});
