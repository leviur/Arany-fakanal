// Rendelési + foglalási SLA — alapértelmezések (API betöltés előtt, index.js APP_STATE)
let statusLimits = {
  "Új": 30,
  "Elfogadva": 45,
  "Készül": 60,
  "Kiszállítás alatt": 90,
};

let bookingLimits = {
  warnNew: 60,
  problemNew: 180,
  warnConfirmed: 24,
};

const OPENING_HOURS_DAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

// Nyitvatartás munkapéldány — API tölti felül (lásd loadSettings)
let openingHours = {
  monday:    { closed: false, open: "11:00", close: "22:00" },
  tuesday:   { closed: false, open: "11:00", close: "22:00" },
  wednesday: { closed: false, open: "11:00", close: "22:00" },
  thursday:  { closed: false, open: "11:00", close: "22:00" },
  friday:    { closed: false, open: "11:00", close: "22:00" },
  saturday:  { closed: false, open: "11:00", close: "22:00" },
  sunday:    { closed: false, open: "11:00", close: "22:00" },
};

let openingHoursExceptions = [];

function applySettingsUpdate() {
  refreshDashboard();
}

function saveBookingsRules() {
  saveBookingsRulesAsync();
}

// Foglalási SLA mentése az adatbázisba (PUT /api/sla-rules/)
async function saveBookingsRulesAsync() {
  try {
    await SlaRules.saveSlaRules({
      booking_limits: SlaRules.readBookingLimitsFromForm(),
    });
    bookingLimits = window.APP_STATE.bookingLimits;
    applySettingsUpdate();
    window.showToast?.("Foglalási szabályok mentve!", "success");
  } catch (err) {
    console.error("Foglalási szabályok mentése sikertelen:", err);
    const message = typeof parseApiError === "function"
      ? parseApiError(err, "Foglalási szabályok mentése sikertelen")
      : "Foglalási szabályok mentése sikertelen";
    window.showToast?.(message, "error");
  }
}

function updateHoursRowDisabledState(day) {
  const closed = document.getElementById(`hours-${day}-closed`).checked;
  document.getElementById(`hours-${day}-open`).disabled = closed;
  document.getElementById(`hours-${day}-close`).disabled = closed;
}

function applyOpeningHoursToForm() {
  OPENING_HOURS_DAYS.forEach(day => {
    const dayHours = openingHours[day];
    document.getElementById(`hours-${day}-closed`).checked = dayHours.closed;
    document.getElementById(`hours-${day}-open`).value = dayHours.open || "";
    document.getElementById(`hours-${day}-close`).value = dayHours.close || "";
    updateHoursRowDisabledState(day);
  });
}

function saveOpeningHours() {
  saveOpeningHoursAsync();
}

async function saveOpeningHoursAsync() {
  OPENING_HOURS_DAYS.forEach(day => {
    openingHours[day] = {
      closed: document.getElementById(`hours-${day}-closed`).checked,
      open: document.getElementById(`hours-${day}-open`).value,
      close: document.getElementById(`hours-${day}-close`).value,
    };
  });

  const ok = await persistOpeningHoursToApi();
  if (ok) {
    window.showToast?.("Nyitvatartás mentve!", "success");
  }
}

/* ================= ESETI KIVÉTELEK (ünnepnapok stb.) ================= */
function escapeSettingsHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function formatExceptionDate(dateStr) {
  return dateStr.replace(/-/g, ".") + ".";
}

function toggleExceptionFormFields() {
  const closed = document.getElementById("exception-closed").checked;
  document.getElementById("exception-open").disabled = closed;
  document.getElementById("exception-close").disabled = closed;
}

function renderExceptionsList() {
  const container = document.getElementById("hoursExceptionsList");
  if (!container) return;

  if (!openingHoursExceptions.length) {
    container.innerHTML = '<p class="hours-exceptions-empty">Nincs megadva eseti kivétel.</p>';
    return;
  }

  container.innerHTML = openingHoursExceptions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(ex => {
      const desc = ex.closed ? "Zárva" : `${ex.open}–${ex.close}`;
      return `
        <div class="hours-exception-row">
          <span class="hours-exception-date">${formatExceptionDate(ex.date)}</span>
          <span class="hours-exception-label">${escapeSettingsHtml(ex.label || "")}</span>
          <span class="hours-exception-desc">${desc}</span>
          <button type="button" class="hours-exception-delete" onclick="deleteOpeningHoursException('${ex.date}')" aria-label="Kivétel törlése">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>`;
    }).join("");
}

function addOpeningHoursException() {
  addOpeningHoursExceptionAsync();
}

async function addOpeningHoursExceptionAsync() {
  const date = document.getElementById("exception-date").value;
  const label = document.getElementById("exception-label").value.trim();
  const closed = document.getElementById("exception-closed").checked;
  const open = document.getElementById("exception-open").value;
  const close = document.getElementById("exception-close").value;

  if (!date) {
    window.showToast?.("Válassz dátumot!", "error");
    return;
  }
  if (!closed && (!open || !close)) {
    window.showToast?.("Add meg a nyitás és zárás idejét, vagy jelöld zárva-ként!", "error");
    return;
  }

  openingHoursExceptions = openingHoursExceptions.filter(ex => ex.date !== date);
  openingHoursExceptions.push({
    date,
    label,
    closed,
    open: closed ? null : open,
    close: closed ? null : close,
  });

  const ok = await persistOpeningHoursToApi();
  if (!ok) return;

  renderExceptionsList();

  document.getElementById("exception-date").value = "";
  document.getElementById("exception-label").value = "";
  document.getElementById("exception-closed").checked = true;
  toggleExceptionFormFields();

  window.showToast?.("Kivétel hozzáadva", "success");
}

function deleteOpeningHoursException(date) {
  deleteOpeningHoursExceptionAsync(date);
}

async function deleteOpeningHoursExceptionAsync(date) {
  openingHoursExceptions = openingHoursExceptions.filter(ex => ex.date !== date);

  const ok = await persistOpeningHoursToApi();
  if (!ok) return;

  renderExceptionsList();
  window.showToast?.("Kivétel törölve", "deleted");
}

async function persistOpeningHoursToApi() {
  try {
    await OpeningHours.saveOpeningHours({
      opening_hours: openingHours,
      exceptions: openingHoursExceptions,
    });
    clearSettingsDirty();
    return true;
  } catch (err) {
    console.error("Nyitvatartás mentése sikertelen:", err);
    const message = typeof parseApiError === "function"
      ? parseApiError(err, "Nyitvatartás mentése sikertelen")
      : "Nyitvatartás mentése sikertelen";
    window.showToast?.(message, "error");
    return false;
  }
}

// Beállítások betöltése: nyitvatartás + SLA az API-ból (adatbázis)
async function loadSettings() {
  try {
    const hoursData = await OpeningHours.fetchOpeningHours();
    openingHours = hoursData.opening_hours;
    openingHoursExceptions = hoursData.exceptions || [];
    applyOpeningHoursToForm();
    renderExceptionsList();
  } catch (err) {
    console.error("Nyitvatartás betöltése sikertelen:", err);
    window.showToast?.("Nyitvatartás betöltése sikertelen", "error");
    applyOpeningHoursToForm();
    renderExceptionsList();
  }

  try {
    await SlaRules.fetchSlaRules();
    statusLimits = window.APP_STATE.statusLimits;
    bookingLimits = window.APP_STATE.bookingLimits;
    SlaRules.applyOrderLimitsToForm();
    SlaRules.applyBookingLimitsToForm();
  } catch (err) {
    console.error("SLA szabályok betöltése sikertelen:", err);
    window.showToast?.("SLA szabályok betöltése sikertelen", "error");
    SlaRules.applyOrderLimitsToForm();
    SlaRules.applyBookingLimitsToForm();
  }
}

/* ================= EL NEM MENTETT MÓDOSÍTÁS FIGYELMEZTETÉS ================= */
window.settingsDirty = false;

function markSettingsDirty() {
  window.settingsDirty = true;
}

function clearSettingsDirty() {
  window.settingsDirty = false;
}

function bindSettingsDirtyTracking() {
  const section = document.getElementById("settings-section");
  if (!section) return;

  section.addEventListener("input", markSettingsDirty);
  section.addEventListener("change", markSettingsDirty);

  section.addEventListener("click", (e) => {
    if (e.target.closest(".save-menu-btn") || e.target.closest(".hours-exception-add-btn")) {
      setTimeout(clearSettingsDirty, 0);
    }
  });
}

bindSettingsDirtyTracking();

/**
 * Beállítások űrlap frissítése revision változásra — live-sync.js hívja.
 * Ha van elmentetlen módosítás (settingsDirty), nem írunk felül.
 */
window.refreshSettingsFromApi = async function refreshSettingsFromApi() {
  if (window.settingsDirty) return;

  try {
    const hoursData = await OpeningHours.fetchOpeningHours({ force: true });
    openingHours = hoursData.opening_hours;
    openingHoursExceptions = hoursData.exceptions || [];
    applyOpeningHoursToForm();
    renderExceptionsList();
  } catch (err) {
    console.error("Nyitvatartás szinkron sikertelen:", err);
  }

  if (typeof SlaRules === "undefined") return;

  try {
    await SlaRules.fetchSlaRules({ force: true });
    statusLimits = window.APP_STATE.statusLimits;
    bookingLimits = window.APP_STATE.bookingLimits;
    SlaRules.applyOrderLimitsToForm();
    SlaRules.applyBookingLimitsToForm();
    if (typeof loadStatusLimits === "function") loadStatusLimits();
  } catch (err) {
    console.error("SLA szinkron sikertelen:", err);
  }
};

window.addEventListener("beforeunload", (e) => {
  if (window.settingsDirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Foglalás sor SLA állapota — booking_limits az APP_STATE-ből (adatbázis)
function parseBookingDateTime(value) {
  if (!value) return null;
  const normalized = String(value).trim().replace(/\./g, "-").replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getBookingEventTime(booking) {
  if (booking?.eventDateTime) {
    return parseBookingDateTime(booking.eventDateTime);
  }
  if (booking?.dateIso && booking?.time) {
    return parseBookingDateTime(`${booking.dateIso} ${booking.time}`);
  }
  if (booking?.date && booking?.time) {
    const datePart = String(booking.date).replace(/\./g, "-");
    return parseBookingDateTime(`${datePart} ${booking.time}`);
  }
  return null;
}

function getBookingStatus(booking) {
  const now = new Date();
  const status = booking.status || "Új";
  const createdAt = parseBookingDateTime(booking.createdAt);
  const diffMin = createdAt ? (now - createdAt) / 60000 : NaN;
  const limits = window.APP_STATE?.bookingLimits || bookingLimits;

  if (!limits) return { state: "ok", label: "OK" };

  if (!createdAt) {
    return { state: "problem", label: "Nincs dátum" };
  }

  if (status === "Lemondva") {
    return { state: "ok", label: "Lemondva" };
  }

  if (status === "Teljesítve") {
    return { state: "ok", label: "Teljesítve" };
  }

  if (status === "Új") {
    if (diffMin >= limits.problemNew) {
      return { state: "problem", label: `Új > ${limits.problemNew} perc` };
    }
    if (diffMin >= limits.warnNew) {
      return { state: "warning", label: `Új > ${limits.warnNew} perc` };
    }
    return { state: "ok", label: "Új" };
  }

  if (status === "Visszaigazolt") {
    const eventTime = getBookingEventTime(booking);
    if (!eventTime) {
      return { state: "ok", label: "Visszaigazolt" };
    }

    const diffHours = (eventTime - now) / 3600000;

    if (diffHours >= 0 && diffHours <= limits.warnConfirmed) {
      return { state: "warning", label: "Közelgő foglalás" };
    }

    return { state: "ok", label: "Visszaigazolt" };
  }

  return { state: "ok", label: status };
}

void loadSettings();
