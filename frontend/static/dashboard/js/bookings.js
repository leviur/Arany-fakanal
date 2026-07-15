/**********************
 * FOGLALÁSOK — dashboard táblázat
 *
 * Adat: bookings[] memória (GET /api/reservations/ után normalizeReservations).
 * Sikeres PATCH/DELETE után: applyBookingUpdate / removeBooking (orders.js mintájára).
 **********************/

const Bookings = (() => {

  /* ================= STATE ================= */
  let activeBookingsKpiFilter = null;
  let editingBookingId = null;
  let bookingsSortColumn = null;
  let bookingsSortDir = 1;
  let bookingsInitialRendered = false;
  let pendingDeleteId = null;
  let bookingsEventsbound = false;

  let bookings = [];
  let isLoading = false;
  let isReady = false;

  /* ================= STÁTUSZ TÉRKÉP ================= */
  const STATUS_TO_KEY = {
    "Új":           "new",
    "Visszaigazolt": "confirmed",
    "Lemondva":      "cancelled",
    "Teljesítve":    "done"
  };

  // Dashboard felirat → API/DB kulcs
  const STATUS_LABEL_TO_API = {
    "Új": "pending",
    "Visszaigazolt": "confirmed",
    "Lemondva": "cancelled",
    "Teljesítve": "done",
  };

  function findBooking(id) {
    const numId = Number(id);
    return bookings.find((b) => b.id === numId || String(b.id) === String(id));
  }

  // DB kód → magyar megjelenítés (asztalfoglalas.html opciók)
  const OCCASION_LABELS = {
    csaladi: "Családi összejövetel",
    uzleti: "Üzleti ebéd / vacsora",
    szulinap: "Születésnap",
    evfordulo: "Évforduló",
    egyeb: "Egyéb",
  };

  function mapOccasion(value) {
    if (!value) return "—";
    return OCCASION_LABELS[value] || value;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function truncateNote(text, maxLen = 28) {
    const value = String(text ?? "");
    if (value.length <= maxLen) return value;
    return `${value.slice(0, maxLen)}…`;
  }

  function setLoading(state) {
    isLoading = state;
    document.body.classList.toggle("is-loading", state);
  }

  function mapStatus(s) {
    switch (s) {
      case "pending": return "Új";
      case "confirmed": return "Visszaigazolt";
      case "cancelled": return "Lemondva";
      case "done": return "Teljesítve";
      default: return "Új";
    }
  }
  // átalakítja a backend mezőket  (pl. guest_name → name, pending → Új):
  function normalizeReservations(data) {
    return data.map(r => ({
      id: r.id,

      name: r.guest_name,
      email: r.guest_email,
      phone: r.guest_phone,
      guests: r.guest_count,

      occasion: mapOccasion(r.occasion),
      occasionCode: r.occasion ?? "",

      dateIso: r.date ?? "",
      dateLabel: window.formatHuDate?.(r.date) ?? (r.date ?? ""),
      time: r.time?.slice(0, 5) ?? "",

      status: mapStatus(r.status),

      note: r.notes ?? "",

      createdAt: r.created_at
        ? (window.formatHuDateTime?.(r.created_at) ?? "")
        : "",

      eventDateTime: `${r.date} ${r.time?.slice(0, 5) ?? ""}`,

    }));
  }

  // feltölti a bookings-ot, itt csak datokat olvasunk az adatbázisból - GET request, nem kell X-CSRFToken.
  async function loadBookings() {
  
    try {

      console.log("API RAW RESPONSE START");
      setLoading(true);
      const res = await fetch("/api/reservations/", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      console.log("RAW DATA:", data);
      bookings = normalizeReservations(data);
      console.log("NORMALIZED BOOKINGS:", bookings);
      isReady = true;
      renderBookings(false);

    } catch (err) {
        console.error("Bookings load error:", err);
        bookings = [];
        renderBookings(false);
        window.showToast?.("Hiba a foglalások betöltésekor", "error");
    } finally {
      setLoading(false);
    }
  }

  function isLoaded() {
    return isReady;
  }

  function refresh() {
    return loadBookings();
  }

  function render() {
    bindEvents();
    return loadBookings();
  }

  /* ================= HELYI ÁLLAPOT SZINKRON (sikeres API után) ================= */

  /**
   * Backend Reservation JSON → bookings[] frissítés + táblázat újrarenderelés.
   * Használat: PATCH státusz, PATCH szerkesztés után.
   */
  function applyBookingUpdate(apiReservation, { refreshDashboard = false } = {}) {
    const mapped = normalizeReservations([apiReservation])[0];
    const index = bookings.findIndex((b) => b.id === mapped.id);

    if (index !== -1) {
      bookings[index] = mapped;
    } else {
      bookings.push(mapped);
    }

    renderBookings(false);

    if (refreshDashboard) {
      window.refreshDashboard?.();
    }
  }

  /**
   * Foglalás eltávolítása a memóriából.
   * Használat: DELETE /api/reservations/<id>/ után (204).
   */
  function removeBooking(bookingId, { refreshDashboard = false } = {}) {
    const numId = Number(bookingId);
    const index = bookings.findIndex(
      (b) => b.id === numId || String(b.id) === String(bookingId),
    );

    if (index !== -1) {
      bookings.splice(index, 1);
    }

    renderBookings(false);

    if (refreshDashboard) {
      window.refreshDashboard?.();
    }
  }

  // PATCH /api/reservations/<id>/status/ — Reservation.status frissül az adatbázisban
  async function updateBookingStatus(id, statusLabel) {
    const booking = findBooking(id);
    const apiStatus = STATUS_LABEL_TO_API[statusLabel];
    if (!booking || !apiStatus) return;

    const previousStatus = booking.status;
    booking.status = statusLabel;
    renderBookings(false);

    try {
      const res = await apiRequest(`/api/reservations/${booking.id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: apiStatus }),
      });

      if (!res.ok) {
        booking.status = previousStatus;
        renderBookings(false);
        const message = await readApiErrorMessage(res, "Státusz mentés sikertelen");
        window.showToast?.(message, "error");
        return;
      }

      const updated = await res.json();
      applyBookingUpdate(updated, { refreshDashboard: true });
    } catch (err) {
      console.error("Foglalás státusz mentés sikertelen:", err);
      booking.status = previousStatus;
      renderBookings(false);
      window.showToast?.("Státusz mentés sikertelen", "error");
    }
  }

  /* ================= KPI FRISSÍTÉS ================= */
  function updateBookingsKpis() {
    const counts = { new: 0, confirmed: 0, cancelled: 0, done: 0 };
    let hasProblem = false;
    let hasWarn = false;

    bookings.forEach(b => {
      const key = STATUS_TO_KEY[b.status] || "new";
      counts[key]++;

      if (b.status === "Új" && typeof getBookingStatus === "function") {
        const sla = getBookingStatus(b);
        if (sla.state === "problem") hasProblem = true;
        else if (sla.state === "warning") hasWarn = true;
      }
    });

    const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setKpi("kpi-bookings-new",       counts.new);
    setKpi("kpi-bookings-confirmed", counts.confirmed);
    setKpi("kpi-bookings-cancelled", counts.cancelled);
    setKpi("kpi-bookings-done",      counts.done);

    const dot = document.getElementById("kpi-bookings-new-dot");
    if (dot) {
      if (hasProblem) {
        dot.classList.remove("hidden", "warn");
      } else if (hasWarn) {
        dot.classList.remove("hidden");
        dot.classList.add("warn");
      } else {
        dot.classList.add("hidden");
      }
    }
  }

  /* ================= FILTER / SORT ================= */
  function matchesKpiFilter(b) {
    if (!activeBookingsKpiFilter) return true;
    return (STATUS_TO_KEY[b.status] || "new") === activeBookingsKpiFilter;
  }

  function getSortedFiltered() {
    const search = (document.getElementById("bookingSearch")?.value || "").toLowerCase();

    console.log("FILTER INPUT:", document.getElementById("bookingSearch")?.value);
    console.log("BOOKINGS LENGTH:", bookings.length);

    let list = bookings.filter(b => {
      if (!matchesKpiFilter(b)) return false;
      if (!search) return true;
      return (
        b.name.toLowerCase().includes(search) ||
        b.email.toLowerCase().includes(search) ||
        b.phone.toLowerCase().includes(search) ||
        b.occasion.toLowerCase().includes(search) ||
        (b.occasionCode || "").toLowerCase().includes(search) ||
        (b.dateLabel || "").toLowerCase().includes(search) ||
        (b.dateIso || "").includes(search) ||
        (b.time || "").includes(search)
      );
    });

    if (bookingsSortColumn) {
      list = [...list].sort((a, b) => {
        let av = a[bookingsSortColumn] ?? "";
        let bv = b[bookingsSortColumn] ?? "";
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        return av < bv ? -bookingsSortDir : av > bv ? bookingsSortDir : 0;
      });
    } else {
      list = [...list].sort((a, b) => new Date(a.eventDateTime) - new Date(b.eventDateTime));
    }

    return list;
  }

  // Kereső + KPI chip szűrő — sorok display:none alapján
  function filterBookings() {
    renderBookings(false);
  }

  /* ================= ROW HTML ================= */
  function createRow(b) {
    const sla = typeof getBookingStatus === "function" ? getBookingStatus(b) : { state: "ok" };
    let rowClass = "";
    if (sla.state === "warning") rowClass = "row-warning";
    if (sla.state === "problem") rowClass = "row-problem";

    const statusKey = STATUS_TO_KEY[b.status] || "new";
    const hasNote = Boolean(b.note);
    const noteDisplay = hasNote ? truncateNote(b.note) : "—";
    const noteIsLong = hasNote && b.note.length > 28;
    const noteExpandClass = noteIsLong ? " note-expandable" : "";
    const noteTitle = hasNote ? ` title="${escapeHtml(b.note)}"` : "";

    return `
      <tr data-id="${b.id}" class="${rowClass}">
        <td data-label="Vendég"><span class="booking-cell-primary">${escapeHtml(b.name)}</span></td>
        <td data-label="Kapcsolat">
          <div class="booking-cell-contact">
            <span class="booking-contact-email">${escapeHtml(b.email)}</span>
            <span class="booking-contact-phone">${escapeHtml(b.phone)}</span>
          </div>
        </td>
        <td data-label="Részletek">
          <div class="booking-cell-detail">
            <span class="booking-detail-occasion">${escapeHtml(b.occasion)}</span>
            <span class="booking-detail-guests"><span class="booking-guests-chip">${b.guests} fő</span></span>
          </div>
        </td>
        <td data-label="Időpont">
          <div class="booking-cell-time">
            <span class="booking-time-event">${escapeHtml(b.dateLabel)} ${escapeHtml(b.time)}</span>
            <span class="booking-time-created">Leadva: ${escapeHtml(b.createdAt)}</span>
          </div>
        </td>
        <td data-label="Megjegyzés"><span class="booking-note-cell${noteExpandClass}" data-id="${b.id}"${noteTitle}>${escapeHtml(noteDisplay)}</span></td>
        <td data-label="Státusz">
          <button type="button" class="booking-status-badge status-${statusKey}" data-id="${b.id}" aria-label="Státusz módosítása">
            ${b.status}
          </button>
        </td>
        <td data-label="Műveletek" style="text-align:right;">
          <button type="button" class="action-btn bookings-edit-btn" data-id="${b.id}" aria-label="Szerkesztés"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="action-btn bookings-delete-btn" data-id="${b.id}" aria-label="Törlés"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`;
  }

  function bookingsRowsHtml(list) {
    if (!list.length) {
      return `<tr><td colspan="7" style="text-align:center;padding:32px;color:#aaa;font-size:13px;">Nincs találat</td></tr>`;
    }
    return list.map(createRow).join("");
  }

  // KPI sor + tbody; keresés/szűrő a drawTable végén fut
  function renderBookings(animate = false) {
    console.log("RENDER BOOKINGS CALLED");
    const tbody = document.getElementById("bookingTableBody");

    console.log("TBODY:", tbody);
    console.log("bookings:", bookings);


    const kpiRow = document.getElementById("bookingsKpiRow");
    if (!tbody) {
      console.warn("❌ bookingTableBody NINCS az oldalon!");
      return;
    }

    const list = getSortedFiltered();
    console.log("FILTERED LIST:", list);

    function drawTable() {
      updateBookingsKpis();
      tbody.innerHTML = bookingsRowsHtml(list);
      bookingsInitialRendered = true;
    }

    if (animate && bookingsInitialRendered) {
      tbody.classList.add("is-refreshing");
      kpiRow?.classList.add("is-refreshing");
      setTimeout(() => {
        drawTable();
        tbody.classList.remove("is-refreshing");
        kpiRow?.classList.remove("is-refreshing");
      }, 150);
    } else {
      drawTable();
    }
  }

  /* ================= STÁTUSZ POPOVER ================= */
  function openBookingStatusPopover(badge) {
    closeBookingStatusPopover();
    const id = badge.dataset.id;
    const booking = findBooking(id);
    if (!booking) return;

    const pop = document.createElement("div");
    pop.id = "booking-status-popover";

    const statuses = [
      { label: "Új",           key: "new" },
      { label: "Visszaigazolt", key: "confirmed" },
      { label: "Lemondva",     key: "cancelled" },
      { label: "Teljesítve",   key: "done" },
    ];

    statuses.forEach(({ label, key }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `booking-popover-option status-${key}${booking.status === label ? " current" : ""}`;
      btn.dataset.status = label;
      btn.dataset.bookingId = id;
      btn.textContent = label;
      pop.appendChild(btn);
    });

    document.body.appendChild(pop);

    requestAnimationFrame(() => {
      const rect = badge.getBoundingClientRect();
      const popW = pop.offsetWidth;
      const popH = pop.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = rect.left;
      let top  = rect.bottom + 6;

      if (left + popW > vw - 8) left = vw - popW - 8;
      if (top  + popH > vh - 8) top  = rect.top - popH - 6;

      pop.style.left = `${left}px`;
      pop.style.top  = `${top}px`;
    });
  }

  function closeBookingStatusPopover() {
    document.getElementById("booking-status-popover")?.remove();
  }

  /* ================= MEGJEGYZÉS POPOVER ================= */
  function openBookingNotePopover(cell) {
    closeBookingNotePopover();
    const id = cell.dataset.id;
    const booking = findBooking(id);
    if (!booking?.note) return;

    const pop = document.createElement("div");
    pop.id = "booking-note-popover";

    const nameEl = document.createElement("p");
    nameEl.className = "note-popover-name";
    nameEl.textContent = booking.name;

    const textEl = document.createElement("p");
    textEl.className = "note-popover-text";
    textEl.textContent = booking.note;

    pop.append(nameEl, textEl);
    document.body.appendChild(pop);

    requestAnimationFrame(() => {
      const rect = cell.getBoundingClientRect();
      const popW = pop.offsetWidth;
      const popH = pop.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = rect.left;
      let top  = rect.bottom + 6;

      if (left + popW > vw - 8) left = vw - popW - 8;
      if (top  + popH > vh - 8) top  = rect.top - popH - 6;

      pop.style.left = `${left}px`;
      pop.style.top  = `${top}px`;
    });
  }

  function closeBookingNotePopover() {
    document.getElementById("booking-note-popover")?.remove();
  }

  /* ================= EDIT MODAL ================= */
  function openBookingModal(id) {
    const booking = findBooking(id);
    if (!booking) return;
    editingBookingId = id;

    document.getElementById("m-name").value    = booking.name;
    document.getElementById("m-email").value   = booking.email;
    document.getElementById("m-phone").value   = booking.phone;
    document.getElementById("m-occasion").value = booking.occasionCode || "";
    document.getElementById("m-date").value    = booking.dateIso || "";
    document.getElementById("m-guests").value  = booking.guests;
    document.getElementById("m-note").value    = booking.note || "";
    initTimeStepper(booking.time, document.getElementById("m-date").value);

    const modal = document.getElementById("bookingModal");
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeBookingModal() {
    const modal = document.getElementById("bookingModal");
    modal.classList.remove("open");
    setTimeout(() => modal.classList.add("hidden"), 150);
    editingBookingId = null;
  }

  function saveBookingModal() {
    saveBookingModalAsync();
  }

  // PATCH /api/reservations/<id>/ — vendég adatok + dátum/idő/alkalom/létszám/megjegyzés
  async function saveBookingModalAsync() {
    if (!editingBookingId) return;
    const booking = findBooking(editingBookingId);
    if (!booking) return;

    const timeValue = document.getElementById("m-time").value;
    if (!timeValue) {
      window.showToast?.("Ezen a napon zárva vagyunk, válassz másik dátumot!", "error");
      return;
    }

    const guestCount = Number(document.getElementById("m-guests").value);
    if (!Number.isFinite(guestCount) || guestCount < 1) {
      window.showToast?.("A létszámnak legalább 1 főnek kell lennie.", "error");
      return;
    }

    const occasionValue = document.getElementById("m-occasion").value;
    const payload = {
      guest_name: document.getElementById("m-name").value.trim(),
      guest_email: document.getElementById("m-email").value.trim(),
      guest_phone: document.getElementById("m-phone").value.trim(),
      occasion: occasionValue || null,
      date: document.getElementById("m-date").value,
      time: timeValue,
      guest_count: guestCount,
      notes: document.getElementById("m-note").value.trim(),
    };

    try {
      const res = await apiRequest(`/api/reservations/${booking.id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await readApiErrorMessage(res, "Foglalás mentése sikertelen");
        window.showToast?.(message, "error");
        return;
      }

      const updated = await res.json();
      closeBookingModal();
      applyBookingUpdate(updated, { refreshDashboard: true });
      window.showToast?.("Foglalás mentve", "success");
    } catch (err) {
      console.error("Foglalás mentés sikertelen:", err);
      window.showToast?.("Foglalás mentése sikertelen", "error");
    }
  }

  /* ================= DELETE MODAL ================= */
  function openBookingDeleteConfirm(id) {
    pendingDeleteId = id;
    const modal = document.getElementById("bookingDeleteConfirmModal");
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeBookingDeleteConfirm() {
    const modal = document.getElementById("bookingDeleteConfirmModal");
    modal.classList.remove("open");
    setTimeout(() => modal.classList.add("hidden"), 150);
    pendingDeleteId = null;
  }

  async function confirmBookingDelete() {
    if (!pendingDeleteId) return;

    const bookingId = pendingDeleteId;

    try {
      // DELETE /api/reservations/<id>/ — Reservation rekord törlése az adatbázisból
      const res = await apiRequest(`/api/reservations/${bookingId}/`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const message = await readApiErrorMessage(res, "Törlés sikertelen");
        window.showToast?.(message, "error");
        return;
      }

      closeBookingDeleteConfirm();
      removeBooking(bookingId, { refreshDashboard: true });
      window.showToast?.("Foglalás törölve", "deleted");
    } catch (err) {
      console.error("Foglalás törlés sikertelen:", err);
      window.showToast?.("Törlés sikertelen", "error");
    }
  }

  /* ================= CLICK HANDLER ================= */
  function handleBookingClick(e) {
    // Popover opció — státusz mentése API-ra
    const popOpt = e.target.closest(".booking-popover-option");
    if (popOpt) {
      updateBookingStatus(popOpt.dataset.bookingId, popOpt.dataset.status);
      closeBookingStatusPopover();
      return;
    }

    // Státusz badge — popover megnyitása (előbb, mint a bezárás)
    const badge = e.target.closest(".booking-status-badge");
    if (badge) {
      openBookingStatusPopover(badge);
      return;
    }

    // Popoverek bezárása kattintásra
    if (!e.target.closest("#booking-status-popover")) {
      closeBookingStatusPopover();
    }
    if (!e.target.closest("#booking-note-popover") && !e.target.closest(".note-expandable")) {
      closeBookingNotePopover();
    }

    // Megjegyzés popover
    const noteCell = e.target.closest(".note-expandable");
    if (noteCell) { openBookingNotePopover(noteCell); return; }

    // Szerkesztés
    const editBtn = e.target.closest(".bookings-edit-btn");
    if (editBtn) { openBookingModal(editBtn.dataset.id); return; }

    // Törlés
    const delBtn = e.target.closest(".bookings-delete-btn");
    if (delBtn) { openBookingDeleteConfirm(delBtn.dataset.id); return; }

    // KPI chip toggle
    const kpiBtn = e.target.closest(".bookings-kpi");
    if (kpiBtn) {
      const filter = kpiBtn.dataset.filter;
      if (activeBookingsKpiFilter === filter) {
        activeBookingsKpiFilter = null;
        kpiBtn.setAttribute("aria-pressed", "false");
        kpiBtn.classList.remove("active");
      } else {
        activeBookingsKpiFilter = filter;
        document.querySelectorAll(".bookings-kpi").forEach(k => {
          k.setAttribute("aria-pressed", "false");
          k.classList.remove("active");
        });
        kpiBtn.setAttribute("aria-pressed", "true");
        kpiBtn.classList.add("active");
      }
      filterBookings();
      return;
    }

    // Rendezés (th kattintás)
    const th = e.target.closest("#bookings-section th.sortable");
    if (th) {
      const col = th.dataset.col;
      if (bookingsSortColumn === col) {
        bookingsSortDir *= -1;
      } else {
        bookingsSortColumn = col;
        bookingsSortDir = 1;
      }
      document.querySelectorAll("#bookings-section th.sortable").forEach(t => t.classList.remove("sort-active"));
      th.classList.add("sort-active");
      renderBookings(false);
    }
  }

  /* ================= BIND EVENTS (egyszer) ================= */
  function bindEvents() {
    if (bookingsEventsbound) return;
    bookingsEventsbound = true;

    document.addEventListener("click", handleBookingClick);

    document.getElementById("bookingSearch")
      ?.addEventListener("input", filterBookings);

    document.getElementById("bookingModalCancelBtn")
      ?.addEventListener("click", closeBookingModal);
    document.getElementById("bookingModalSaveBtn")
      ?.addEventListener("click", saveBookingModal);
    document.getElementById("bookingModal")
      ?.addEventListener("click", e => { if (e.target.id === "bookingModal") closeBookingModal(); });

    // dátum váltásakor az aznapi nyitvatartás szerint újragenerált időpontok
    document.getElementById("m-date")
      ?.addEventListener("change", e => initTimeStepper(null, e.target.value));

    document.getElementById("bookingDeleteConfirmOk")
      ?.addEventListener("click", confirmBookingDelete);
    document.getElementById("bookingDeleteConfirmCancel")
      ?.addEventListener("click", closeBookingDeleteConfirm);
    document.getElementById("bookingDeleteConfirmModal")
      ?.addEventListener("click", e => { if (e.target.id === "bookingDeleteConfirmModal") closeBookingDeleteConfirm(); });
  }

  function getBookings() {
    return bookings.map(b => ({ ...b, status: b.status || "Új" }));
  }

  return {
    render,
    refresh,
    loadBookings,
    renderBookings,
    filterBookings,
    getBookings,
    openModal:    openBookingModal,
    closeModal:   closeBookingModal,
    saveModal:    saveBookingModal,
    deleteBooking: openBookingDeleteConfirm,
  };

})();


/* ================= IDŐ STEPPER (nyitvatartás API alapján) ================= */
let currentTimeSlots = [];
let timeIndex = 0;

function updateTimeUI() {
  const disp = document.getElementById("time-display");
  const inp  = document.getElementById("m-time");

  if (!currentTimeSlots.length) {
    if (disp) disp.textContent = "Zárva";
    if (inp)  inp.value = "";
    return;
  }

  const time = currentTimeSlots[timeIndex];
  if (disp) disp.textContent = time;
  if (inp)  inp.value = time;
}

function initTimeStepper(selectedTime, dateStr) {
  currentTimeSlots = window.OpeningHours?.getTimeSlotsForDate(dateStr) || [];
  const idx = currentTimeSlots.indexOf(selectedTime);
  timeIndex = idx >= 0 ? idx : 0;
  updateTimeUI();

  document.getElementById("time-prev").onclick = () => {
    if (timeIndex > 0) { timeIndex--; updateTimeUI(); }
  };
  document.getElementById("time-next").onclick = () => {
    if (timeIndex < currentTimeSlots.length - 1) { timeIndex++; updateTimeUI(); }
  };
}

