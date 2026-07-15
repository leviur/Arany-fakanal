/**********************
 * Dashboard SLA szabályok — rendelések + foglalások (API / adatbázis)
 **********************/

const SlaRules = (() => {
  const DEFAULT_STATUS_LIMITS = {
    "Új": 30,
    "Elfogadva": 45,
    "Készül": 60,
    "Kiszállítás alatt": 90,
  };

  const DEFAULT_BOOKING_LIMITS = {
    warnNew: 60,
    problemNew: 180,
    warnConfirmed: 24,
  };

  let cache = null;

  // Memória + APP_STATE szinkron (dashboard.js, orders.js, getBookingStatus)
  function applyToAppState(data) {
    window.APP_STATE = window.APP_STATE || {};
    window.APP_STATE.statusLimits = data.status_limits || { ...DEFAULT_STATUS_LIMITS };
    window.APP_STATE.bookingLimits = data.booking_limits || { ...DEFAULT_BOOKING_LIMITS };
    cache = data;
  }

  function getData() {
    if (cache) return cache;
    return {
      status_limits: window.APP_STATE?.statusLimits || { ...DEFAULT_STATUS_LIMITS },
      booking_limits: window.APP_STATE?.bookingLimits || { ...DEFAULT_BOOKING_LIMITS },
    };
  }

  async function fetchSlaRules({ force = false } = {}) {
    if (cache && !force) return cache;

    // szabályok betöltése az adatbázisból
    const response = await fetch("/api/sla-rules/", { credentials: "include" });
    if (!response.ok) {
      throw new Error(`SLA szabályok betöltése sikertelen (${response.status})`);
    }

    const data = await response.json();
    applyToAppState(data);
    return data;
  }

  async function saveSlaRules(partial = {}) {
    const current = getData();
    const payload = {
      status_limits: partial.status_limits || current.status_limits,
      booking_limits: partial.booking_limits || current.booking_limits,
    };

    const response = await apiRequest("/api/sla-rules/", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw err;
    }

    const data = await response.json();
    applyToAppState(data);
    return data;
  }

  // Beállítások űrlap — rendelés státusz limitek (perc)
  function applyOrderLimitsToForm() {
    const limits = getData().status_limits;
    const setLimit = (id, key) => {
      const el = document.getElementById(id);
      if (el) el.value = limits[key];
    };

    setLimit("limit-new", "Új");
    setLimit("limit-accepted", "Elfogadva");
    setLimit("limit-preparing", "Készül");
    setLimit("limit-delivery", "Kiszállítás alatt");
  }

  // Beállítások űrlap — foglalás figyelmeztetések
  function applyBookingLimitsToForm() {
    const limits = getData().booking_limits;
    const warnMin = document.getElementById("booking-warn-minutes");
    const problemMin = document.getElementById("booking-problem-minutes");
    const warnHours = document.getElementById("booking-warn-hours");

    if (warnMin) warnMin.value = limits.warnNew;
    if (problemMin) problemMin.value = limits.problemNew;
    if (warnHours) warnHours.value = limits.warnConfirmed;
  }

  function readOrderLimitsFromForm() {
    return {
      "Új": Number(document.getElementById("limit-new")?.value || 0),
      "Elfogadva": Number(document.getElementById("limit-accepted")?.value || 0),
      "Készül": Number(document.getElementById("limit-preparing")?.value || 0),
      "Kiszállítás alatt": Number(document.getElementById("limit-delivery")?.value || 0),
    };
  }

  function readBookingLimitsFromForm() {
    return {
      warnNew: Number(document.getElementById("booking-warn-minutes")?.value || 0),
      problemNew: Number(document.getElementById("booking-problem-minutes")?.value || 0),
      warnConfirmed: Number(document.getElementById("booking-warn-hours")?.value || 0),
    };
  }

  return {
    fetchSlaRules,
    saveSlaRules,
    applyToAppState,
    getData,
    applyOrderLimitsToForm,
    applyBookingLimitsToForm,
    readOrderLimitsFromForm,
    readBookingLimitsFromForm,
    DEFAULT_STATUS_LIMITS,
    DEFAULT_BOOKING_LIMITS,
  };
})();

window.SlaRules = SlaRules;
