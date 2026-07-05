/**********************
 * live-sync.js — élő szinkron (revision poll, 2 mp)
 *
 * Backend: valami változik → bump_revision() → GET /api/revision/ szám nő.
 * Frontend: 2 mp-enként lekérdezzük a számot; ha változott, alább felsorolt
 * részek frissülnek (csak ami az adott oldalon elérhető).
 *
 **********************/

const LiveSync = (() => {
  const POLL_MS = 2000;
  let revision = null;
  let timer = null;

  async function fetchRevision() {
    const response = await fetch("/api/revision/");
    if (!response.ok) {
      throw new Error(`Verzió lekérdezése sikertelen (${response.status})`);
    }
    const data = await response.json();
    return data.revision;
  }

  /** Homepage lábléc + foglalás oldal nyitvatartás blokk + időpont-választó */
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

  /** Dashboard: rendelések, foglalások, KPI-k (csak admin oldalon van loadOrdersFromApi) */
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
    window.refreshDashboard?.();
  }

  /** Dashboard beállítások fül — settings.js exportálja (elmentetlen módosításnál kihagyja) */
  async function refreshSettingsPanel() {
    if (typeof window.refreshSettingsFromApi !== "function") return;
    try {
      await window.refreshSettingsFromApi();
    } catch (error) {
      console.error("Beállítások szinkron sikertelen:", error);
    }
  }

  /** Revision nőtt → minden releváns adat újratöltése */
  async function onRevisionChanged() {
    if (typeof OpeningHours !== "undefined") {
      await OpeningHours.fetchOpeningHours({ force: true });
      refreshOpeningHoursDisplays();
    }

    await refreshDashboardData();
    await refreshSettingsPanel();
  }

  async function poll() {
    if (document.hidden) return;

    try {
      const current = await fetchRevision(); /* kiolvasom a revision számot (értsd verziószámot) */
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
