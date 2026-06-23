const Bookings = (() => {

  /* ================= STATE ================= */
  let activeBookingsKpiFilter = null;
  let editingBookingId = null;
  let bookingsSortColumn = null;
  let bookingsSortDir = 1;
  let bookingsInitialRendered = false;
  let pendingDeleteId = null;
  let bookingsEventsbound = false;

  /* ================= DEMO ADATOK ================= */
  const demoBookings = [
    { id: "001", name: "Kiss János",             email: "kiss.janos@gmail.com",      phone: "+36 30 111 2233", occasion: "Születésnap",       date: "2026.06.09", time: "17:00", eventDateTime: "2026.06.09 17:00", createdAt: "2026.06.08 09:00", guests: 4,  note: "Ablak melletti asztalt kérnek, lehetőleg a déli oldalon. Allergén: mogyoró, glutén. A tortát 19:00-ra kérik, gyertyával. Zenét is kértek, de halk legyen.", status: "Új" },
    { id: "002", name: "Nagy Anna",              email: "anna.nagy@gmail.com",        phone: "+36 20 444 5566", occasion: "Évforduló",          date: "2026.06.09", time: "18:30", eventDateTime: "2026.06.09 18:30", createdAt: "2026.06.08 09:15", guests: 2,  note: "",                      status: "Új" },
    { id: "003", name: "Szabó Péter",            email: "szabo.peter@freemail.hu",    phone: "+36 70 777 8899", occasion: "Céges vacsora",      date: "2026.06.09", time: "20:00", eventDateTime: "2026.06.09 20:00", createdAt: "2026.06.08 10:00", guests: 8,  note: "VIP asztal",            status: "Új" },
    { id: "004", name: "Tóth Réka",              email: "reka.toth@gmail.com",        phone: "+36 30 222 3344", occasion: "Baráti találkozó",   date: "2026.06.09", time: "21:00", eventDateTime: "2026.06.09 21:00", createdAt: "2026.06.08 10:30", guests: 3,  note: "",                      status: "Új" },
    { id: "005", name: "Horváth László",         email: "laci.horvath@gmail.com",     phone: "+36 20 123 4567", occasion: "Családi ebéd",       date: "2026.06.10", time: "13:00", eventDateTime: "2026.06.10 13:00", createdAt: "2026.06.08 11:00", guests: 5,  note: "Etetőszék szükséges",   status: "Visszaigazolt" },
    { id: "006", name: "Kovács Dóra",            email: "kovacs.dora@gmail.com",      phone: "+36 70 987 6543", occasion: "Születésnap",       date: "2026.06.10", time: "19:00", eventDateTime: "2026.06.10 19:00", createdAt: "2026.06.08 11:30", guests: 6,  note: "Torta szükséges",       status: "Visszaigazolt" },
    { id: "007", name: "Varga Tamás",            email: "tamas.varga@gmail.com",      phone: "+36 30 555 6677", occasion: "Randevú",           date: "2026.06.10", time: "19:30", eventDateTime: "2026.06.10 19:30", createdAt: "2026.06.08 12:00", guests: 2,  note: "",                      status: "Visszaigazolt" },
    { id: "008", name: "Farkas Lilla",           email: "lilla.farkas@gmail.com",     phone: "+36 20 333 4455", occasion: "Évforduló",          date: "2026.06.10", time: "20:00", eventDateTime: "2026.06.10 20:00", createdAt: "2026.06.08 12:45", guests: 2,  note: "Romantikus asztal",     status: "Visszaigazolt" },
    { id: "009", name: "Molnár Zoltán",          email: "zoltan.molnar@gmail.com",    phone: "+36 70 111 9988", occasion: "Üzleti ebéd",        date: "2026.06.11", time: "12:00", eventDateTime: "2026.06.11 12:00", createdAt: "2026.06.08 13:00", guests: 3,  note: "Csendesebb sarok",      status: "Új" },
    { id: "010", name: "Balogh Katalin",         email: "kati.balogh@gmail.com",      phone: "+36 30 666 7788", occasion: "Névnap",            date: "2026.06.11", time: "18:00", eventDateTime: "2026.06.11 18:00", createdAt: "2026.06.08 13:30", guests: 4,  note: "",                      status: "Lemondva" },
    { id: "011", name: "Lakatos Imre",           email: "imre.lakatos@gmail.com",     phone: "+36 20 222 1100", occasion: "Baráti sörözés",    date: "2026.06.11", time: "20:30", eventDateTime: "2026.06.11 20:30", createdAt: "2026.06.08 14:00", guests: 6,  note: "",                      status: "Visszaigazolt" },
    { id: "012", name: "Papp Viktória",          email: "viktoria.papp@gmail.com",    phone: "+36 70 444 3322", occasion: "Születésnap",       date: "2026.06.12", time: "17:00", eventDateTime: "2026.06.12 17:00", createdAt: "2026.06.08 14:30", guests: 5,  note: "Gyertyák kellenek",     status: "Visszaigazolt" },
    { id: "013", name: "Németh Ádám",            email: "adam.nemeth@gmail.com",      phone: "+36 30 888 7766", occasion: "Randevú",           date: "2026.06.12", time: "18:30", eventDateTime: "2026.06.12 18:30", createdAt: "2026.06.08 15:00", guests: 2,  note: "",                      status: "Új" },
    { id: "014", name: "Oláh Zsófia",            email: "zsofia.olah@gmail.com",      phone: "+36 20 999 0011", occasion: "Családi vacsora",    date: "2026.06.12", time: "19:00", eventDateTime: "2026.06.12 19:00", createdAt: "2026.06.08 15:30", guests: 4,  note: "",                      status: "Új" },
    { id: "015", name: "Gulyás Tamás",           email: "tamas.gulyas@gmail.com",     phone: "+36 70 222 5566", occasion: "Céges csapatépítő", date: "2026.06.13", time: "19:00", eventDateTime: "2026.06.13 19:00", createdAt: "2026.06.08 16:00", guests: 10, note: "Hosszú asztal",         status: "Visszaigazolt" },
    { id: "016", name: "Takács Éva",             email: "eva.takacs@gmail.com",       phone: "+36 30 444 8877", occasion: "Baráti találkozó",   date: "2026.06.13", time: "20:00", eventDateTime: "2026.06.13 20:00", createdAt: "2026.06.08 16:30", guests: 4,  note: "",                      status: "Új" },
    { id: "017", name: "Simon Krisztián",        email: "krisztian.simon@gmail.com",  phone: "+36 20 111 6677", occasion: "Születésnap",       date: "2026.06.14", time: "18:00", eventDateTime: "2026.06.14 18:00", createdAt: "2026.06.08 17:00", guests: 7,  note: "",                      status: "Visszaigazolt" },
    { id: "018", name: "Boros Dóra",             email: "dora.boros@gmail.com",       phone: "+36 70 555 4433", occasion: "Évforduló",          date: "2026.06.14", time: "19:30", eventDateTime: "2026.06.14 19:30", createdAt: "2026.06.08 17:30", guests: 2,  note: "Pezsgő bekészítve",     status: "Teljesítve" },
    { id: "019", name: "Kerekes Márk",           email: "mark.kerekes@gmail.com",     phone: "+36 30 777 0099", occasion: "Randevú",           date: "2026.06.14", time: "20:00", eventDateTime: "2026.06.14 20:00", createdAt: "2026.06.08 18:00", guests: 2,  note: "",                      status: "Teljesítve" },
    { id: "020", name: "Szalai Petra",           email: "petra.szalai@gmail.com",     phone: "+36 20 888 2233", occasion: "Baráti sörözés",    date: "2026.06.15", time: "21:00", eventDateTime: "2026.06.15 21:00", createdAt: "2026.06.08 18:30", guests: 3,  note: "Pult közelébe",         status: "Lemondva" },
  ];

  /* ================= STÁTUSZ TÉRKÉP ================= */
  const STATUS_TO_KEY = {
    "Új":           "new",
    "Visszaigazolt": "confirmed",
    "Lemondva":      "cancelled",
    "Teljesítve":    "done"
  };

  /* ================= KPI FRISSÍTÉS ================= */
  function updateBookingsKpis() {
    const counts = { new: 0, confirmed: 0, cancelled: 0, done: 0 };
    let hasProblem = false;
    let hasWarn = false;

    demoBookings.forEach(b => {
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

    let list = demoBookings.filter(b => {
      if (!matchesKpiFilter(b)) return false;
      if (!search) return true;
      return (
        b.name.toLowerCase().includes(search) ||
        b.email.toLowerCase().includes(search) ||
        b.phone.toLowerCase().includes(search) ||
        b.occasion.toLowerCase().includes(search) ||
        b.date.includes(search)
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
    const note = b.note || "—";
    const noteIsLong = b.note && b.note.length > 28;
    const noteTruncated = noteIsLong ? b.note.slice(0, 28) + "…" : note;
    const noteTitle = b.note ? `title="${b.note.replace(/"/g, '&quot;')}"` : "";
    const noteExpandClass = noteIsLong ? " note-expandable" : "";

    return `
      <tr data-id="${b.id}" class="${rowClass}">
        <td><span class="booking-cell-primary">${b.name}</span></td>
        <td>
          <div class="booking-cell-contact">
            <span class="booking-contact-email">${b.email}</span>
            <span class="booking-contact-phone">${b.phone}</span>
          </div>
        </td>
        <td>
          <div class="booking-cell-detail">
            <span class="booking-detail-occasion">${b.occasion}</span>
            <span class="booking-detail-guests"><span class="booking-guests-chip">× ${b.guests}</span> fő</span>
          </div>
        </td>
        <td>
          <div class="booking-cell-time">
            <span class="booking-time-event">${b.date} ${b.time}</span>
            <span class="booking-time-created">Leadva: ${b.createdAt}</span>
          </div>
        </td>
        <td><span class="booking-note-cell${noteExpandClass}" data-id="${b.id}" ${noteTitle}>${noteTruncated}</span></td>
        <td>
          <button type="button" class="booking-status-badge status-${statusKey}" data-id="${b.id}" aria-label="Státusz módosítása">
            ${b.status}
          </button>
        </td>
        <td style="text-align:right;">
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

  /* ================= RENDER ================= */
  function renderBookings(animate = false) {
    const tbody = document.getElementById("bookingTableBody");
    const kpiRow = document.getElementById("bookingsKpiRow");
    if (!tbody) return;

    const list = getSortedFiltered();

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
    const booking = demoBookings.find(b => b.id === id);
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
    const booking = demoBookings.find(b => b.id === id);
    if (!booking?.note) return;

    const pop = document.createElement("div");
    pop.id = "booking-note-popover";
    pop.innerHTML = `
      <p class="note-popover-name">${booking.name}</p>
      <p class="note-popover-text">${booking.note}</p>`;
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
    const booking = demoBookings.find(b => b.id === id);
    if (!booking) return;
    editingBookingId = id;

    document.getElementById("m-name").value    = booking.name;
    document.getElementById("m-email").value   = booking.email;
    document.getElementById("m-phone").value   = booking.phone;
    document.getElementById("m-occasion").value = booking.occasion;
    document.getElementById("m-date").value    = booking.date.replace(/\./g, "-");
    document.getElementById("m-guests").value  = booking.guests;
    document.getElementById("m-note").value    = booking.note || "";
    initTimeStepper(booking.time);

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
    if (!editingBookingId) return;
    const booking = demoBookings.find(b => b.id === editingBookingId);
    if (!booking) return;

    booking.name     = document.getElementById("m-name").value;
    booking.email    = document.getElementById("m-email").value;
    booking.phone    = document.getElementById("m-phone").value;
    booking.occasion = document.getElementById("m-occasion").value;
    booking.date     = document.getElementById("m-date").value.replace(/-/g, ".");
    booking.time     = document.getElementById("m-time").value;
    booking.eventDateTime = `${booking.date} ${booking.time}`;
    booking.guests   = document.getElementById("m-guests").value;
    booking.note     = document.getElementById("m-note").value;

    closeBookingModal();
    renderBookings(false);
    window.refreshDashboard?.();
    window.showToast?.("Foglalás mentve", "success");
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

  function confirmBookingDelete() {
    if (!pendingDeleteId) return;
    const idx = demoBookings.findIndex(b => b.id === pendingDeleteId);
    if (idx !== -1) demoBookings.splice(idx, 1);
    closeBookingDeleteConfirm();
    renderBookings(false);
    window.refreshDashboard?.();
    window.showToast?.("Foglalás törölve", "deleted");
  }

  /* ================= CLICK HANDLER ================= */
  function handleBookingClick(e) {
    // Popover opció
    const popOpt = e.target.closest(".booking-popover-option");
    if (popOpt) {
      const status    = popOpt.dataset.status;
      const bookingId = popOpt.dataset.bookingId;
      const booking   = demoBookings.find(b => b.id === bookingId);
      if (booking) booking.status = status;
      closeBookingStatusPopover();
      renderBookings(false);
      window.refreshDashboard?.();
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

    // Státusz badge
    const badge = e.target.closest(".booking-status-badge");
    if (badge) { openBookingStatusPopover(badge); return; }

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

    document.getElementById("bookingDeleteConfirmOk")
      ?.addEventListener("click", confirmBookingDelete);
    document.getElementById("bookingDeleteConfirmCancel")
      ?.addEventListener("click", closeBookingDeleteConfirm);
    document.getElementById("bookingDeleteConfirmModal")
      ?.addEventListener("click", e => { if (e.target.id === "bookingDeleteConfirmModal") closeBookingDeleteConfirm(); });
  }

  /* ================= PUBLIC API ================= */
  function render() {
    bindEvents();
    renderBookings(false);
  }

  function getBookings() {
    return demoBookings.map(b => ({ ...b, status: b.status || "Új" }));
  }

  return {
    render,
    renderBookings,
    filterBookings,
    getBookings,
    openModal:    openBookingModal,
    closeModal:   closeBookingModal,
    saveModal:    saveBookingModal,
    deleteBooking: openBookingDeleteConfirm,
  };

})();


/* ================= IDŐ STEPPER ================= */
const TIME_SLOTS = (() => {
  const arr = [];
  for (let t = 11 * 60; t <= 20 * 60 + 30; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return arr;
})();

let timeIndex = 0;

function updateTimeUI() {
  const time = TIME_SLOTS[timeIndex];
  const disp = document.getElementById("time-display");
  const inp  = document.getElementById("m-time");
  if (disp) disp.textContent = time;
  if (inp)  inp.value = time;
}

function initTimeStepper(selectedTime = "11:00") {
  const idx = TIME_SLOTS.indexOf(selectedTime);
  timeIndex = idx >= 0 ? idx : 0;
  updateTimeUI();

  document.getElementById("time-prev").onclick = () => {
    if (timeIndex > 0) { timeIndex--; updateTimeUI(); }
  };
  document.getElementById("time-next").onclick = () => {
    if (timeIndex < TIME_SLOTS.length - 1) { timeIndex++; updateTimeUI(); }
  };
}
