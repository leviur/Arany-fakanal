/**********************
 * Nyitvatartás — közös modul (API + megjelenítés + időpontok)
 **********************/

const OpeningHours = (() => {
  const WEEKDAY_ORDER = [
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  ];

  const DAY_KEY_BY_INDEX = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
  ];

  const WEEKDAY_LABELS = {
    monday: "Hétfő",
    tuesday: "Kedd",
    wednesday: "Szerda",
    thursday: "Csütörtök",
    friday: "Péntek",
    saturday: "Szombat",
    sunday: "Vasárnap",
  };

  const WEEKDAY_ABBREV = {
    monday: "H",
    tuesday: "K",
    wednesday: "Sze",
    thursday: "Cs",
    friday: "P",
    saturday: "Szo",
    sunday: "Vas",
  };

  let cache = null;

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }
    return null;
  }

  function applyToAppState(data) {
    window.APP_STATE = window.APP_STATE || {};
    window.APP_STATE.openingHours = data.opening_hours || {};
    window.APP_STATE.openingHoursExceptions = data.exceptions || [];
    cache = data;
  }

  function getData() {
    if (cache) return cache;
    return {
      opening_hours: window.APP_STATE?.openingHours || {},
      exceptions: window.APP_STATE?.openingHoursExceptions || [],
    };
  }

  async function fetchOpeningHours({ force = false } = {}) {
    if (cache && !force) return cache;

    const response = await fetch("/api/opening-hours/");
    if (!response.ok) {
      throw new Error(`Nyitvatartás betöltése sikertelen (${response.status})`);
    }

    const data = await response.json();
    applyToAppState(data);
    return data;
  }

  async function saveOpeningHours(payload) {
    const headers = { "Content-Type": "application/json" };
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }

    const response = await fetch("/api/opening-hours/", {
      method: "PUT",
      credentials: "include",
      headers,
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

  function getDayKeyFromDateStr(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return DAY_KEY_BY_INDEX[date.getDay()];
  }

  function getDayHoursInfo(dateStr) {
    if (!dateStr) return null;

    const data = getData();
    const exception = (data.exceptions || []).find((ex) => ex.date === dateStr);
    if (exception) return exception;

    const dayKey = getDayKeyFromDateStr(dateStr);
    return data.opening_hours?.[dayKey] || null;
  }

  function getTimeSlotsForDate(dateStr) {
    if (!dateStr) return [];

    const dayInfo = getDayHoursInfo(dateStr);
    if (!dayInfo || dayInfo.closed || !dayInfo.open || !dayInfo.close) {
      return [];
    }

    const [openH, openM] = dayInfo.open.split(":").map(Number);
    const [closeH, closeM] = dayInfo.close.split(":").map(Number);
    const startMin = openH * 60 + openM;
    const endMin = closeH * 60 + closeM;

    const slots = [];
    for (let t = startMin; t <= endMin; t += 30) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return slots;
  }

  function daySignature(dayInfo) {
    if (!dayInfo) return "missing";
    if (dayInfo.closed) return "closed";
    return `${dayInfo.open}-${dayInfo.close}`;
  }

  function formatRangeLabel(startKey, endKey, abbrev = false) {
    if (abbrev) {
      if (startKey === endKey) return WEEKDAY_ABBREV[startKey];
      return `${WEEKDAY_ABBREV[startKey]}–${WEEKDAY_ABBREV[endKey]}`;
    }
    if (startKey === endKey) return WEEKDAY_LABELS[startKey];
    return `${WEEKDAY_LABELS[startKey]} – ${WEEKDAY_LABELS[endKey]}`;
  }

  function groupWeeklyHoursForDisplay(openingHours, { abbrev = false } = {}) {
    const groups = [];
    let index = 0;

    while (index < WEEKDAY_ORDER.length) {
      const startKey = WEEKDAY_ORDER[index];
      const signature = daySignature(openingHours[startKey]);
      let endIndex = index + 1;

      while (
        endIndex < WEEKDAY_ORDER.length &&
        daySignature(openingHours[WEEKDAY_ORDER[endIndex]]) === signature
      ) {
        endIndex += 1;
      }

      const dayInfo = openingHours[startKey];
      let description = "Zárva";
      if (dayInfo && !dayInfo.closed && dayInfo.open && dayInfo.close) {
        description = `${dayInfo.open} – ${dayInfo.close}`;
      }

      groups.push({
        label: formatRangeLabel(startKey, WEEKDAY_ORDER[endIndex - 1], abbrev),
        description,
      });

      index = endIndex;
    }

    return groups;
  }

  function getUpcomingExceptions(exceptions, daysAhead = 90) {
    const today = new Date().toISOString().split("T")[0];
    const limit = new Date();
    limit.setDate(limit.getDate() + daysAhead);
    const limitStr = limit.toISOString().split("T")[0];

    return (exceptions || [])
      .filter((ex) => ex.date >= today && ex.date <= limitStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function formatExceptionDate(dateStr) {
    return `${dateStr.replace(/-/g, ".")}.`;
  }

  function renderWeeklyHours(container, { abbrev = false } = {}) {
    if (!container) return;

    const { opening_hours: openingHours } = getData();
    const groups = groupWeeklyHoursForDisplay(openingHours, { abbrev });

    container.innerHTML = groups
      .map(
        (group) => `
          <div class="hours-row">
            <span>${group.label}</span><span>${group.description}</span>
          </div>
        `,
      )
      .join("");
  }

  function renderUpcomingExceptions(container, { daysAhead = 90 } = {}) {
    if (!container) return;

    const { exceptions } = getData();
    const upcoming = getUpcomingExceptions(exceptions, daysAhead);

    if (!upcoming.length) {
      container.innerHTML = "";
      container.hidden = true;
      return;
    }

    container.hidden = false;
    const title = container.dataset.heading || "Közelgő eltérések";

    container.innerHTML = `
      <p class="opening-hours-exceptions-title">${title}</p>
      ${upcoming
        .map((ex) => {
          const desc = ex.closed ? "Zárva" : `${ex.open} – ${ex.close}`;
          const label = ex.label ? ` — ${ex.label}` : "";
          return `
            <div class="hours-row hours-row--exception">
              <span>${formatExceptionDate(ex.date)}${label}</span>
              <span>${desc}</span>
            </div>
          `;
        })
        .join("")}
    `;
  }

  function populateTimeSelect(selectEl, dateStr, selectedTime = "") {
    if (!selectEl) return;

    if (!dateStr) {
      selectEl.innerHTML = '<option value="">Válasszon dátumot először…</option>';
      selectEl.value = "";
      return;
    }

    const slots = getTimeSlotsForDate(dateStr);
    if (!slots.length) {
      selectEl.innerHTML = '<option value="">Ezen a napon zárva vagyunk</option>';
      selectEl.value = "";
      return;
    }

    selectEl.innerHTML =
      '<option value="">Válasszon…</option>' +
      slots.map((slot) => `<option value="${slot}">${slot}</option>`).join("");

    if (selectedTime && slots.includes(selectedTime)) {
      selectEl.value = selectedTime;
    }
  }

  return {
    fetchOpeningHours,
    saveOpeningHours,
    getDayHoursInfo,
    getTimeSlotsForDate,
    groupWeeklyHoursForDisplay,
    getUpcomingExceptions,
    renderWeeklyHours,
    renderUpcomingExceptions,
    populateTimeSelect,
    applyToAppState,
    getData,
    WEEKDAY_ORDER,
  };
})();

window.OpeningHours = OpeningHours;
