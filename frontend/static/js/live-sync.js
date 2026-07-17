/**********************
 * live-sync.js — automatikus frissítés több böngészőablak között
 *
 * Mit csinál ez a fájl?
 *   - 2 másodpercenként rákérdez a szerverre: változott-e valami az adatbázisban?
 *   - Ha igen → újratölti a menüt, kosarat, dashboardot, vendégközpontot stb.
 *
 * Hogyan működik?
 *   1. Admin módosít valamit (rendelés, menü, nyitvatartás…) → a szerver revision száma nő
 *   2. Ez a fájl lekéri: GET /api/revision/ → pl. { "revision": 43 }
 *   3. Ha más szám jött, mint legutóbb → meghívja a frissítő függvényeket
 *
 * Backend (röviden): sync/models.py, sync/signals.py — mentéskor revision++
 * Kívülről: window.LiveSync.start() / stop() (automatikusan indul oldal betöltéskor)
 **********************/

const LiveSync = (() => {
  const POLL_MS = 2000; // ennyi ms-enként kérdez rá a szerverre
  let revision = null; // utoljára látott revision szám — ehhez hasonlítjuk az újat
  let timer = null; // setInterval azonosítója — leállításhoz

  // Lekéri a szerver aktuális revision számát (GET /api/revision/)
  async function fetchRevision() {
    const response = await fetch("/api/revision/");
    if (!response.ok) {
      throw new Error(`Verzió lekérdezése sikertelen (${response.status})`);
    }
    const data = await response.json();
    return data.revision;
  }

  // Újrarajzolja a nyitvatartást a képernyőn (adat már frissült fetchOpeningHours-szal)
  //   Hol: főoldal lábléc, nyitvatartás szekció, asztalfoglalás idő dropdown
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

  // Dashboard adatok újratöltése — rendelések, foglalások, üzenetek, KPI
  //   Csak akkor fut, ha az adott JS betöltődött (orders.js, bookings.js, messages.js)
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

  // Vendégközpont (/guest-portal/) szekciók frissítése
  //   Átadja a guest-portal-sync.js-nek → rendelések, adataim, foglalások
  async function refreshGuestPortalData() {
    if (typeof window.refreshGuestPortal !== "function") return;

    try {
      await window.refreshGuestPortal();
    } catch (error) {
      console.error("Vendégközpont szinkron sikertelen:", error);
    }
  }

  // Dashboard Beállítások fül frissítése (settings.js)
  async function refreshSettingsPanel() {
    if (typeof window.refreshSettingsFromApi !== "function") return;
    try {
      await window.refreshSettingsFromApi();
    } catch (error) {
      console.error("Beállítások szinkron sikertelen:", error);
    }
  }

  // Mit csinál: revision nőtt → mindent újratölt, ami az adott oldalon betöltődött
  //   Példa: főoldalon heti menü + nyitvatartás; dashboardon rendelések + üzenetek
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

    await refreshGuestPortalData();

    if (typeof MenuManager !== "undefined") {
      MenuManager.refresh();
    }

    await refreshSettingsPanel();
  }

  // 2 mp-enként ellenőrzi, nőtt-e a revision szám
  //   Első alkalommal: csak eltárolja (az oldal már betöltötte az adatot)
  //   Ha a lap háttérben van (document.hidden) → nem kérdez (kíméli a szervert)
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
      // Hálózati hiba — csendben várunk a következő poll-ra
    }
  }

  // Elindítja a 2 mp-enkénti ellenőrzést
  function start() {
    if (timer) return;

    fetchRevision()
      .then((value) => {
        revision = value;
      })
      .catch(() => {});

    timer = setInterval(poll, POLL_MS);
  }

  // Leállítja az automatikus ellenőrzést
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
