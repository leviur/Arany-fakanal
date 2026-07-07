/**********************
 * live-sync.js — élő szinkron (revision poll, 2 másodpercenként)
 *
 * ═══ Hogyan működik a verziókezelés? ═══
 *
 * BACKEND (adatbázis):
 *   sync/models.py       → AppRevision.revision (egyetlen szám, pl. 42)
 *   sync/services.py     → bump_revision() növeli, get_revision() olvassa
 *   sync/signals.py      → on_dashboard_data_change() → bump_revision() mentés/törléskor
 *   sync/views.py        → GET /api/revision/ → { "revision": 42 }
 *
 * FRONTEND (ez a fájl):
 *   start() → setInterval(poll, 2000)
 *   poll() → fetchRevision() → ha a szám változott → onRevisionChanged()
 *
 * onRevisionChanged() meghívja (ami az adott oldalon létezik):
 *   OpeningHours.fetchOpeningHours() + refreshOpeningHoursDisplays()  → opening-hours.js
 *   window.refreshWeeklyMenu()   → weekly-menu.js (főoldal heti menü)
 *   window.refreshEtlap()        → etlap.js (publikus étlap)
 *   refreshDashboardData()     → orders.js, bookings.js, messages.js, dashboard.js
 *   refreshSettingsPanel()     → settings.js → refreshSettingsFromApi()
 *   MenuManager.refresh()      → menu-manager.js (dashboard Ételek / Heti menü fül)
 *
 * Kézi frissítés (revision nélkül): index.js refresh gomb → loadOrdersFromApi() stb.
 **********************/

const LiveSync = (() => {
  const POLL_MS = 2000;
  let revision = null; // utoljára ismert revision (összehasonlításhoz)
  let timer = null;

  /** GET /api/revision/ — backend: get_revision() → RevisionAPIView */
  async function fetchRevision() {
    const response = await fetch("/api/revision/");
    if (!response.ok) {
      throw new Error(`Verzió lekérdezése sikertelen (${response.status})`);
    }
    const data = await response.json();
    return data.revision;
  }

  /** Nyitvatartás megjelenítés — adat már OpeningHours.fetchOpeningHours()-ban frissült */
  function refreshOpeningHoursDisplays() {
    if (typeof OpeningHours === "undefined") return;

    const footerHours = document.getElementById("footer-opening-hours");
    if (footerHours) {
      OpeningHours.renderWeeklyHours(footerHours, { abbrev: false });
    }

    const footerExceptions = document.getElementById("footer-opening-exceptions");
    if (footerExceptions) {
      OpeningHours.renderUpcomingExceptions(footerExceptions, { daysAhead: 90 });
    }

    const publicHours = document.getElementById("public-opening-hours");
    if (publicHours) {
      OpeningHours.renderWeeklyHours(publicHours, { abbrev: true });
    }

    const publicExceptions = document.getElementById("public-opening-exceptions");
    if (publicExceptions) {
      OpeningHours.renderUpcomingExceptions(publicExceptions, { daysAhead: 90 });
    }

    const dateEl = document.getElementById("date");
    const timeEl = document.getElementById("time");
    if (dateEl && timeEl) {
      OpeningHours.populateTimeSelect(timeEl, dateEl.value, timeEl.value);
    }
  }

  /** Dashboard: rendelések, foglalások, üzenetek, KPI — lásd orders.js, bookings.js, messages.js */
  async function refreshDashboardData() {
    if (typeof loadOrdersFromApi === "function") {
      try {
        await loadOrdersFromApi();
      } catch (error) {
        console.error("Rendelések szinkron sikertelen:", error);
      }
    }

    if (typeof Bookings !== "undefined") {
      try {
        await Bookings.refresh();
      } catch (error) {
        console.error("Foglalások szinkron sikertelen:", error);
      }
    }

    if (typeof renderOrders === "function") renderOrders(false);
    if (typeof Bookings !== "undefined") Bookings.renderBookings(false);

    if (typeof Messages !== "undefined") {
      try {
        await Messages.refresh();
      } catch (error) {
        console.error("Üzenetek szinkron sikertelen:", error);
      }
    }

    window.refreshDashboard?.();
  }

  /** Beállítások fül — settings.js → refreshSettingsFromApi() */
  async function refreshSettingsPanel() {
    if (typeof window.refreshSettingsFromApi !== "function") return;
    try {
      await window.refreshSettingsFromApi();
    } catch (error) {
      console.error("Beállítások szinkron sikertelen:", error);
    }
  }

  /**
   * Revision nőtt (bump_revision a backenden) → minden releváns adat újratöltése.
   * Csak azok a függvények futnak, amelyek az adott oldalon betöltődtek.
   */
  async function onRevisionChanged() {
    if (typeof OpeningHours !== "undefined") {
      await OpeningHours.fetchOpeningHours({ force: true });
      refreshOpeningHoursDisplays();
    }

    if (typeof window.refreshWeeklyMenu === "function") {
      try {
        await window.refreshWeeklyMenu();
      } catch (error) {
        console.error("Heti menü szinkron sikertelen:", error);
      }
    }

    if (typeof window.refreshEtlap === "function") {
      try {
        await window.refreshEtlap();
      } catch (error) {
        console.error("Étlap szinkron sikertelen:", error);
      }
    }

    await refreshDashboardData();

    if (typeof MenuManager !== "undefined") {
      MenuManager.refresh();
    }

    await refreshSettingsPanel();
  }

  /**
   * 2 mp-enként: összehasonlítja a fetchRevision() eredményét az előzővel.
   * Első poll: csak eltárolja (nem frissít — már betöltött az oldal).
   */
  async function poll() {
    if (document.hidden) return;

    try {
      const current = await fetchRevision();
      if (revision === null) {
        revision = current;
        return;
      }
      if (current !== revision) {
        revision = current;
        await onRevisionChanged();
      }
    } catch (_error) {
      // Csendes hiba — következő poll újrapróbálja
    }
  }

  function start() {
    if (timer) return;

    fetchRevision()
      .then((value) => {
        revision = value;
      })
      .catch(() => {});

    timer = setInterval(poll, POLL_MS);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  return { start, stop };
})();

window.LiveSync = LiveSync;
