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

function applySettingsUpdate() {
  refreshDashboard();
}

function saveBookingsRules() {
    bookingLimits = {
        warnNew: Number(document.getElementById("booking-warn-minutes").value || 0),
        problemNew: Number(document.getElementById("booking-problem-minutes").value || 0),
        warnConfirmedHours: Number(document.getElementById("booking-warn-hours").value || 0)
    };

    // mentés localStorage-be
    localStorage.setItem("bookingLimits", JSON.stringify(bookingLimits));

    //  A GLOBÁLIS ÁLLAPOT FRISSSÍTÉSE!
    window.APP_STATE.bookingLimits = bookingLimits;

  // UI / dashboard frissítés
  applySettingsUpdate();

  window.showToast?.("Foglalási szabályok mentve!", "success");
}

function loadSettings() {
  const savedStatus = localStorage.getItem("statusLimits");
  const savedBooking = localStorage.getItem("bookingLimits");

  if (savedStatus) {
    statusLimits = JSON.parse(savedStatus);
    window.APP_STATE.statusLimits = statusLimits; // Szinkronizáld a globális állapottal
  }

  if (savedBooking) {
    bookingLimits = JSON.parse(savedBooking); // JAVÍTVA: bookingRules -> bookingLimits
    window.APP_STATE.bookingLimits = bookingLimits;
  }
}

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

loadSettings();
