/**********************
 * guest-portal/js/guest-portal-sync.js — központi élő frissítés
 *
 * A vendégközpont guest-portal frissítője — de csak a live-sync által indított frissítésekre.
 * 
 * A live-sync.js revision változáskor meghívja: window.refreshGuestPortal()
 *
 * Minden szekció saját reloadja van:
 *   orders.js    → reloadGuestOrders()    — Rendeléseim 
 *   account.js   → reloadGuestAccount()   — Adataim 
 *   bookings.js  → reloadGuestBookings()  — Foglalásaim
 *
 **********************/

/** Egy szekció frissítése — hibát nem dob tovább (többi szekció fusson tovább). */
async function runGuestPortalReload(name, fn) {
  if (typeof fn !== "function") return;

  try {
    await fn();
  } catch (error) {
    console.error(`Vendégközpont szinkron (${name}) sikertelen:`, error);
  }
}

/**
 * Összes vendégközpont szekció újratöltése revision változásra.
 * Párhuzamosan fut — gyorsabb, mint sorban.
 */
async function refreshGuestPortal() {
  await Promise.all([
    runGuestPortalReload("rendelések", window.reloadGuestOrders),
    runGuestPortalReload("adataim", window.reloadGuestAccount),
    runGuestPortalReload("foglalások", window.reloadGuestBookings),
  ]);
}

window.refreshGuestPortal = refreshGuestPortal;
