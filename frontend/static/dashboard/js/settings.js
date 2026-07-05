let statusLimits = {
  "Új": 30,
  "Elfogadva": 45,
  "Készül": 60,
  "Kiszállítás alatt": 90
};

let bookingLimits = {
  warnNew: 60,
  problemNew: 180,
  warnConfirmed: 24
};

const OPENING_HOURS_DAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

let openingHours = {
  monday:    { closed: false, open: "11:00", close: "22:00" },
  tuesday:   { closed: false, open: "11:00", close: "22:00" },
  wednesday: { closed: false, open: "11:00", close: "22:00" },
  thursday:  { closed: false, open: "11:00", close: "22:00" },
  friday:    { closed: false, open: "11:00", close: "22:00" },
  saturday:  { closed: false, open: "11:00", close: "22:00" },
  sunday:    { closed: false, open: "11:00", close: "22:00" }
};

// eseti kivételek a heti rend alól (pl. ünnepnapok): [{ date, label, closed, open, close }]
let openingHoursExceptions = [];

function applySettingsUpdate() {
  refreshDashboard();
}

function saveBookingsRules() {
    bookingLimits = {
        warnNew: Number(document.getElementById("booking-warn-minutes").value || 0),
        problemNew: Number(document.getElementById("booking-problem-minutes").value || 0),
        warnConfirmed: Number(document.getElementById("booking-warn-hours").value || 0)
    };

    // mentés localStorage-be
    localStorage.setItem("bookingLimits", JSON.stringify(bookingLimits));

    //  A GLOBÁLIS ÁLLAPOT FRISSSÍTÉSE!
    window.APP_STATE.bookingLimits = bookingLimits;

  // UI / dashboard frissítés
  applySettingsUpdate();

  window.showToast?.("Foglalási szabályok mentve!", "success");
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
      close: document.getElementById(`hours-${day}-close`).value
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

async function loadSettings() {
  const savedStatus = localStorage.getItem("statusLimits");
  const savedBooking = localStorage.getItem("bookingLimits");

  if (savedStatus) {
    statusLimits = JSON.parse(savedStatus);
    window.APP_STATE.statusLimits = statusLimits;
  }

  if (savedBooking) {
    bookingLimits = JSON.parse(savedBooking);
    window.APP_STATE.bookingLimits = bookingLimits;
  }

  try {
    const data = await OpeningHours.fetchOpeningHours();
    openingHours = data.opening_hours;
    openingHoursExceptions = data.exceptions || [];
    applyOpeningHoursToForm();
    renderExceptionsList();
  } catch (err) {
    console.error("Nyitvatartás betöltése sikertelen:", err);
    window.showToast?.("Nyitvatartás betöltése sikertelen", "error");
    applyOpeningHoursToForm();
    renderExceptionsList();
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

  // bármelyik mentés/hozzáadás gomb megnyomása "elintézettnek" számít
  section.addEventListener("click", (e) => {
    if (e.target.closest(".save-menu-btn") || e.target.closest(".hours-exception-add-btn")) {
      setTimeout(clearSettingsDirty, 0);
    }
  });
}

bindSettingsDirtyTracking();

window.addEventListener("beforeunload", (e) => {
  if (window.settingsDirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

function getBookingStatus(booking) {
  const now = new Date();

  // ha nincs státuszváltás → ÚJ
  const status = booking.status || "Új";

  const createdAt = new Date(booking.createdAt);
  const diffMin = (now - createdAt) / 60000;

  const limits = bookingLimits;

  if (!limits) return { state: "ok", label: "OK" };

  // =========================
  // ÚJ - elapsed alapú logika
  // =========================
  if (status === "Új") {
    if (diffMin >= limits.problemNew) {
      return {
        state: "problem",
        label: "Problémás"
      };
    }

    if (diffMin >= limits.warnNew) {
      return {
        state: "warning",
        label: "Figyelmeztetés"
      };
    }

    return {
      state: "ok",
      label: "Új"
    };
  }

  // =========================
  // VISSZAIGAZOLT - event alapú (külön logika)
  // =========================
  if (status === "Visszaigazolt") {
    const eventTime = new Date(booking.dateTime);
    const diffHours = (eventTime - now) / 3600000;

    if (diffHours <= limits.warnConfirmed) {
      return {
        state: "warning",
        label: "Közelgő foglalás"
      };
    }

    return {
      state: "ok",
      label: "Visszaigazolt"
    };
  }

  return {
    state: "ok",
    label: status
  };
}

void loadSettings();
