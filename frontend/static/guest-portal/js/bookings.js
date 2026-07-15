/**********************
 * guest-portal/js/bookings.js — Foglalásaim szekció
 *
 * API:
 *   Lista:               GET   /api/guest-portal/reservations/?scope=active|closed
 *   Szerkesztés:         PATCH /api/guest-portal/reservations/<id>/         — szerkesztés (csak pending)
 *   Lemondás:            POST  /api/guest-portal/reservations/<id>/cancel/   — lemondás (csak pending)
 *
 * Üzleti szabály:
 *   can_edit (Szerkesztés) és can_cancel(Lemondás) csak „Új” (pending) státusznál true 
 *
 * Live-sync: reloadGuestBookings() — guest-portal-sync.js
 *
 * IIFE,  azonnal lefuttatott függvény: (function () — ne írja felül az orders.js globális segédfüggvényeit (updateToolbarVisibility stb.).
 **********************/

// az itt megadott változók, függvények nem látszanak kívülről
(function () {
    const BOOKING_STATUS_BADGE = {
      Új: "status-new",
      Visszaigazolt: "status-accepted",
      Lemondva: "status-failed",
      Teljesítve: "status-done",
    };

    const ACTIVE_BOOKINGS_PAGE_SIZE = 50;
    const CLOSED_BOOKINGS_PAGE_SIZE = 10;

    let guestBookings = []; //betöltött foglalások
    let bookingsTab = "active"; //"active" / "closed"
    let bookingsPage = 1;
    let bookingsHasNext = false;
    let bookingCounts = { active: 0, closed: 0 };
    let expandedBookingIds = new Set(); //melyik kártya nyitva (accordion)
    let pendingCancelBookingId = null; //lemondás modálban melyik
    /** Szerkesztő modálban éppen melyik foglalás van — null, ha nincs nyitva. */
    let pendingEditBookingId = null; //szerkesztő modálban melyik foglalás

    function formatTime(timeStr) {
      if (!timeStr) return "";
      return String(timeStr).slice(0, 5);
    }

    function escapeHtml(text) {
      return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function getApiErrorMessage(data, fallback = "Hiba történt.") {
      if (!data || typeof data !== "object") return fallback;
      if (typeof data.detail === "string") return data.detail;
      const firstKey = Object.keys(data)[0];
      if (!firstKey) return fallback;
      const value = data[firstKey];
      if (Array.isArray(value)) return value[0];
      return String(value);
    }

    async function fetchGuestBookingsPage(scope, page) {
      const pageSize =
        scope === "active" ? ACTIVE_BOOKINGS_PAGE_SIZE : CLOSED_BOOKINGS_PAGE_SIZE;
      const params = new URLSearchParams({
        scope,
        page: String(page),
        page_size: String(pageSize),
      });
      const response = await apiRequest(`/api/guest-portal/reservations/?${params}`);
      if (!response.ok) {
        throw new Error(`Foglalások betöltése sikertelen (${response.status})`);
      }
      return response.json();
    }

    /** PATCH — csak pending foglalás; a backend validálja a nyitvatartást is. */
    async function patchGuestBooking(bookingId, body) {
      const response = await apiRequest(`/api/guest-portal/reservations/${bookingId}/`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data));
      }
      return data;
    }

    function bookingSummary(booking) {
      const date = window.formatHuDate?.(booking.date) ?? booking.date;
      const time = formatTime(booking.time);
      return `${date} ${time} · ${booking.guest_count} fő`;
    }

    /** Hét napja magyarul — a kinyitott nézet hero sávjához. */
    function formatBookingWeekday(isoDate) {
      if (!isoDate) return "";
      const parts = String(isoDate).slice(0, 10).split("-").map(Number);
      if (parts.length !== 3 || parts.some(Number.isNaN)) return "";
      const [y, m, d] = parts;
      const dt = new Date(y, m - 1, d);
      if (Number.isNaN(dt.getTime())) return "";
      return dt.toLocaleDateString("hu-HU", { weekday: "long" });
    }

    /**
     * Kinyitott foglalás — részletes nézet (Aktív kártya + Lezárt sor).
     * readOnly: Lezárt tab — nincs szerkesztés/lemondás gomb.
     */
    function renderBookingDetails(booking, { readOnly = false } = {}) {
      const badgeClass = BOOKING_STATUS_BADGE[booking.status_label] || "status-new";
      const dateLabel = window.formatHuDate?.(booking.date) ?? booking.date ?? "—";
      const timeLabel = formatTime(booking.time) || "—";
      const weekdayLabel = formatBookingWeekday(booking.date);
      const createdLabel =
        window.formatHuDateTime?.(booking.created_at) ?? booking.created_at ?? "—";

      const notesHtml = booking.notes
        ? `<p class="gp-booking-notes">${escapeHtml(booking.notes)}</p>`
        : `<p class="gp-booking-notes gp-booking-notes--empty">Nincs megjegyzés</p>`;

      const actionButtons = [];
      if (!readOnly && booking.can_edit) {
        actionButtons.push(
          `<button type="button" class="gp-order-btn gp-booking-edit-btn" data-id="${booking.id}">
                <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Szerkesztés
              </button>`,
        );
      }
      if (!readOnly && booking.can_cancel) {
        actionButtons.push(
          `<button type="button" class="gp-order-btn gp-order-btn--danger gp-booking-cancel-btn" data-id="${booking.id}">
                <i class="fa-solid fa-ban" aria-hidden="true"></i> Lemondás
              </button>`,
        );
      }

      const actionsHtml = actionButtons.length
        ? `<div class="gp-booking-actions">${actionButtons.join("")}</div>`
        : "";

      return `
        <div class="gp-booking-details">
          <header class="gp-booking-details-hero">
            <div class="gp-booking-details-when">
              ${weekdayLabel ? `<span class="gp-booking-details-weekday">${escapeHtml(weekdayLabel)}</span>` : ""}
              <div class="gp-booking-details-datetime">
                <span class="gp-booking-details-date">${escapeHtml(dateLabel)}</span>
                <span class="gp-booking-details-time">
                  <i class="fa-regular fa-clock" aria-hidden="true"></i>
                  ${escapeHtml(timeLabel)}
                </span>
              </div>
            </div>
            <div class="gp-booking-details-chips">
              <span class="gp-booking-chip">
                <i class="fa-solid fa-user-group" aria-hidden="true"></i>
                ${booking.guest_count} fő
              </span>
              <span class="gp-status-badge ${badgeClass}">${escapeHtml(booking.status_label)}</span>
            </div>
          </header>

          <div class="gp-booking-details-grid">
            <div class="gp-booking-detail-tile">
              <span class="gp-booking-detail-tile-icon" aria-hidden="true">
                <i class="fa-solid fa-champagne-glasses"></i>
              </span>
              <div class="gp-booking-detail-tile-body">
                <span class="gp-booking-detail-tile-label">Alkalom</span>
                <span class="gp-booking-detail-tile-value">${escapeHtml(booking.occasion_label)}</span>
              </div>
            </div>
            <div class="gp-booking-detail-tile">
              <span class="gp-booking-detail-tile-icon" aria-hidden="true">
                <i class="fa-solid fa-phone"></i>
              </span>
              <div class="gp-booking-detail-tile-body">
                <span class="gp-booking-detail-tile-label">Telefon</span>
                <a class="gp-booking-detail-tile-value gp-booking-detail-link" href="tel:${escapeHtml(booking.guest_phone)}">${escapeHtml(booking.guest_phone)}</a>
              </div>
            </div>
          </div>

          <section class="gp-booking-details-notes" aria-label="Megjegyzés">
            <h4 class="gp-booking-details-notes-title">
              <i class="fa-solid fa-comment-dots" aria-hidden="true"></i>
              Megjegyzés
            </h4>
            ${notesHtml}
          </section>

          <footer class="gp-booking-details-footer">
            <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
            <span>Leadva: ${escapeHtml(createdLabel)}</span>
          </footer>

          ${actionsHtml}
        </div>`;
    }

    function renderActiveBookingCard(booking, isExpanded) {
      const expandedClass = isExpanded ? "is-expanded" : "is-collapsed";
      const badgeClass = BOOKING_STATUS_BADGE[booking.status_label] || "status-new";

      return `
        <article class="gp-booking-card ${expandedClass}" data-booking-id="${booking.id}">
          <button
            type="button"
            class="gp-booking-card-toggle"
            aria-expanded="${isExpanded ? "true" : "false"}"
            aria-controls="gp-booking-body-${booking.id}"
          >
            <div class="gp-booking-card-toggle-main">
              <span class="gp-booking-card-toggle-title">Foglalás #${booking.id}</span>
              <span class="gp-booking-card-toggle-summary">${escapeHtml(bookingSummary(booking))}</span>
            </div>
            <div class="gp-booking-card-toggle-meta">
              <span class="gp-status-badge ${badgeClass}">${escapeHtml(booking.status_label)}</span>
              <i class="fa-solid fa-chevron-down gp-booking-card-chevron" aria-hidden="true"></i>
            </div>
          </button>
          <div class="gp-booking-card-body" id="gp-booking-body-${booking.id}">
            ${renderBookingDetails(booking, { readOnly: false })}
          </div>
        </article>`;
    }

    function renderClosedBookingRow(booking, isExpanded) {
      const expandedClass = isExpanded ? "is-expanded" : "is-collapsed";
      const date = window.formatHuDate?.(booking.date) ?? booking.date;
      const time = formatTime(booking.time);

      return `
        <article class="gp-booking-row ${expandedClass}" data-booking-id="${booking.id}">
          <button
            type="button"
            class="gp-booking-row-toggle"
            aria-expanded="${isExpanded ? "true" : "false"}"
            aria-controls="gp-booking-row-body-${booking.id}"
          >
            <div class="gp-booking-row-main">
              <span class="gp-booking-row-title">Foglalás #${booking.id}</span>
              <span class="gp-booking-row-summary">${escapeHtml(date)} ${escapeHtml(time)} · ${escapeHtml(booking.status_label)}</span>
            </div>
            <div class="gp-booking-row-meta">
              <span class="gp-booking-row-guests">${booking.guest_count} fő</span>
              <i class="fa-solid fa-chevron-down gp-booking-row-chevron" aria-hidden="true"></i>
            </div>
          </button>
          <div class="gp-booking-row-body" id="gp-booking-row-body-${booking.id}">
            ${renderBookingDetails(booking, { readOnly: true })}
          </div>
        </article>`;
    }

    /** Accordion — más nyitott kártya/sor bezárása (Aktív + Lezárt tab). */
    function collapseOtherBookingItems(exceptContainer) {
      document
        .querySelectorAll(
          "#bookingsList .gp-booking-card.is-expanded, #bookingsList .gp-booking-row.is-expanded",
        )
        .forEach((item) => {
          if (item === exceptContainer) return;
          item.classList.remove("is-expanded");
          item.classList.add("is-collapsed");
          item
            .querySelector(".gp-booking-card-toggle, .gp-booking-row-toggle")
            ?.setAttribute("aria-expanded", "false");
        });
    }

    function setBookingExpanded(container, bookingId, expanded) {
      container.classList.toggle("is-expanded", expanded);
      container.classList.toggle("is-collapsed", !expanded);
      container
        .querySelector(".gp-booking-card-toggle, .gp-booking-row-toggle")
        ?.setAttribute("aria-expanded", expanded ? "true" : "false");

      if (expanded) {
        collapseOtherBookingItems(container);
        expandedBookingIds.clear();
        expandedBookingIds.add(bookingId);
      } else {
        expandedBookingIds.delete(bookingId);
      }
    }

    function updateTabCountsUI() {
      const activeEl = document.getElementById("bookingsActiveCount");
      const closedEl = document.getElementById("bookingsClosedCount");
      if (activeEl) activeEl.textContent = bookingCounts.active;
      if (closedEl) closedEl.textContent = bookingCounts.closed;
    }

    function updateTabsUI() {
      document.querySelectorAll(".gp-bookings-tab").forEach((tab) => {
        const isActive = tab.dataset.scope === bookingsTab;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    function updateLoadMoreUI() {
      const btn = document.getElementById("bookingsLoadMoreBtn");
      if (!btn) return;
      const show = bookingsTab === "closed" && guestBookings.length > 0 && bookingsHasNext;
      btn.classList.toggle("gp-orders-hidden", !show);
    }

    function updateBookingsInfoBanner() {
      const activeBanner = document.getElementById("bookingsInfoActive");
      const closedBanner = document.getElementById("bookingsInfoClosed");
      const isActiveTab = bookingsTab === "active";

      activeBanner?.classList.toggle("gp-orders-info-inactive", !isActiveTab);
      closedBanner?.classList.toggle("gp-orders-info-inactive", isActiveTab);
      activeBanner?.setAttribute("aria-hidden", isActiveTab ? "false" : "true");
      closedBanner?.setAttribute("aria-hidden", isActiveTab ? "true" : "false");
    }

    function updateToolbarVisibility() {
      const toolbar = document.getElementById("bookingsToolbar");
      const hasAny = bookingCounts.active + bookingCounts.closed > 0;
      toolbar?.classList.toggle("gp-orders-hidden", !hasAny);
    }

    function renderEmptyState() {
      const emptyEl = document.getElementById("bookingsEmpty");
      if (!emptyEl) return;

      const titleEl = emptyEl.querySelector("h2");
      const textEl = emptyEl.querySelector("p");
      const linkEl = emptyEl.querySelector("a");

      if (bookingsTab === "closed") {
        if (titleEl) titleEl.textContent = "Nincs lezárt foglalásod";
        if (textEl) {
          textEl.textContent = "A teljesített és lemondott foglalásaid itt fognak megjelenni.";
        }
        linkEl?.classList.add("gp-orders-hidden");
        return;
      }

      if (bookingCounts.closed > 0 && bookingCounts.active === 0) {
        if (titleEl) titleEl.textContent = "Nincs aktív foglalásod";
        if (textEl) {
          textEl.textContent =
            "Jelenleg nincs közelgő foglalásod. A korábbiakat a Lezárt tabon nézheted meg.";
        }
        linkEl?.classList.add("gp-orders-hidden");
        return;
      }

      if (titleEl) titleEl.textContent = "Még nincs foglalásod";
      if (textEl) {
        textEl.textContent =
          "Asztalfoglalást a főoldalon adhatsz le — itt fogod látni a státuszt, és Új státuszban szerkesztheted vagy lemondhatod.";
      }
      linkEl?.classList.remove("gp-orders-hidden");
    }

    function renderBookingsList() {
      const listEl = document.getElementById("bookingsList");
      const emptyEl = document.getElementById("bookingsEmpty");
      if (!listEl || !emptyEl) return;

      updateToolbarVisibility();
      updateTabCountsUI();
      updateTabsUI();
      updateBookingsInfoBanner();
      updateLoadMoreUI();

      if (!guestBookings.length) {
        listEl.innerHTML = "";
        listEl.classList.remove("gp-bookings-list--closed");
        listEl.classList.add("gp-orders-hidden");
        renderEmptyState();
        emptyEl.classList.remove("gp-orders-hidden");
        return;
      }

      emptyEl.classList.add("gp-orders-hidden");
      listEl.classList.remove("gp-orders-hidden");
      listEl.classList.toggle("gp-bookings-list--closed", bookingsTab === "closed");
      listEl.innerHTML = guestBookings
        .map((booking) => {
          const isExpanded = expandedBookingIds.has(booking.id);
          return bookingsTab === "closed"
            ? renderClosedBookingRow(booking, isExpanded)
            : renderActiveBookingCard(booking, isExpanded);
        })
        .join("");
    }

    function setBookingsLoading(loading) {
      document.getElementById("bookingsLoading")?.classList.toggle("gp-orders-hidden", !loading);
      if (loading) {
        document.getElementById("bookingsList")?.classList.add("gp-orders-hidden");
        document.getElementById("bookingsEmpty")?.classList.add("gp-orders-hidden");
        document.getElementById("bookingsLoadMoreBtn")?.classList.add("gp-orders-hidden");
      }
    }

    async function loadBookings({ reset = true, preserveExpanded = null } = {}) {
      if (reset) {
        bookingsPage = 1;
        guestBookings = [];
        if (!preserveExpanded) {
          expandedBookingIds.clear();
        }
      }

      setBookingsLoading(reset);

      try {
        const data = await fetchGuestBookingsPage(bookingsTab, bookingsPage);
        bookingCounts.active = data.active_count ?? 0;
        bookingCounts.closed = data.closed_count ?? 0;
        bookingsHasNext = Boolean(data.next);

        const pageResults = data.results || [];
        guestBookings = reset ? pageResults : guestBookings.concat(pageResults);

        if (reset && guestBookings.length) {
          if (preserveExpanded?.size) {
            const existingIds = new Set(guestBookings.map((b) => b.id));
            expandedBookingIds = new Set(
              [...preserveExpanded].filter((id) => existingIds.has(id)),
            );
          }
          if (expandedBookingIds.size > 1) {
            expandedBookingIds = new Set([[...expandedBookingIds][0]]);
          }
          if (expandedBookingIds.size === 0 && bookingsTab === "active") {
            expandedBookingIds.add(guestBookings[0].id);
          }
        }

        renderBookingsList();
      } catch (error) {
        console.error("Foglalások:", error);
        window.showToast?.("Nem sikerült betölteni a foglalásaidat.", "error");
      } finally {
        setBookingsLoading(false);
      }
    }

    async function loadMoreBookings() {
      if (bookingsTab !== "closed" || !bookingsHasNext) return;
      bookingsPage += 1;

      const btn = document.getElementById("bookingsLoadMoreBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Betöltés…";
      }

      try {
        const data = await fetchGuestBookingsPage(bookingsTab, bookingsPage);
        bookingCounts.active = data.active_count ?? bookingCounts.active;
        bookingCounts.closed = data.closed_count ?? bookingCounts.closed;
        bookingsHasNext = Boolean(data.next);
        guestBookings = guestBookings.concat(data.results || []);
        renderBookingsList();
      } catch (error) {
        bookingsPage -= 1;
        console.error("Több foglalás:", error);
        window.showToast?.("Nem sikerült betölteni a többi foglalást.", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Több foglalás betöltése";
        }
      }
    }

    function switchBookingsTab(scope) {
      if (scope === bookingsTab) return;
      bookingsTab = scope;
      loadBookings({ reset: true });
    }

    async function reloadBookings() {
      const previousExpanded = new Set(expandedBookingIds);
      await loadBookings({ reset: true, preserveExpanded: previousExpanded });
    }

    async function reloadGuestBookings() {
      await reloadBookings();
    }

    function openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      modal.classList.remove("modal-hidden");
      requestAnimationFrame(() => modal.classList.add("open"));
    }

    function closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      modal.classList.remove("open");
      setTimeout(() => modal.classList.add("modal-hidden"), 200);
    }

    function findBooking(id) {
      return guestBookings.find((b) => String(b.id) === String(id));
    }

    /** Mai dátum ISO formátumban — date input min attribútumhoz. */
    function todayIsoDate() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    /** Időpont select frissítése a kiválasztott nap alapján (opening-hours.js). */
    function refreshBookingEditTimeSelect(selectedTime = "") {
      const dateEl = document.getElementById("bookingEditDate");
      const timeEl = document.getElementById("bookingEditTime");
      if (!dateEl || !timeEl) return;

      window.OpeningHours?.populateTimeSelect(timeEl, dateEl.value, selectedTime);
    }

    /** Szerkesztő modál kitöltése a kiválasztott foglalás adataival. */
    function openEditModal(bookingId) {
      const booking = findBooking(bookingId);
      if (!booking?.can_edit) return;

      pendingEditBookingId = booking.id;

      const occasionEl = document.getElementById("bookingEditOccasion");
      const dateEl = document.getElementById("bookingEditDate");
      const countEl = document.getElementById("bookingEditGuestCount");
      const phoneEl = document.getElementById("bookingEditPhone");
      const notesEl = document.getElementById("bookingEditNotes");

      if (occasionEl) occasionEl.value = booking.occasion || "";
      if (dateEl) {
        dateEl.min = todayIsoDate();
        dateEl.value = booking.date || "";
      }
      if (countEl) countEl.value = String(booking.guest_count ?? 1);
      if (phoneEl) phoneEl.value = booking.guest_phone || "";
      if (notesEl) notesEl.value = booking.notes || "";

      refreshBookingEditTimeSelect(formatTime(booking.time));
      openModal("bookingEditModal");
    }

    /** Modál mezőiből PATCH body — e-mail szándékosan nincs benne. */
    function readBookingEditForm() {
      const occasion = document.getElementById("bookingEditOccasion")?.value?.trim();
      const date = document.getElementById("bookingEditDate")?.value;
      const time = document.getElementById("bookingEditTime")?.value;
      const guestCount = Number(document.getElementById("bookingEditGuestCount")?.value);
      const guestPhone = document.getElementById("bookingEditPhone")?.value?.trim();
      const notes = document.getElementById("bookingEditNotes")?.value ?? "";

      if (!occasion) throw new Error("Kérjük, válassz alkalmat.");
      if (!date) throw new Error("Kérjük, válassz dátumot.");
      if (!time || time === "Ezen a napon zárva vagyunk") {
        throw new Error("Kérjük, válassz érvényes időpontot.");
      }
      if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > 20) {
        throw new Error("A létszámnak 1 és 20 között kell lennie.");
      }
      if (!guestPhone) throw new Error("Kérjük, add meg a telefonszámot.");

      return {
        occasion,
        date,
        time,
        guest_count: guestCount,
        guest_phone: guestPhone,
        notes,
      };
    }

    async function confirmEditBooking() {
      if (!pendingEditBookingId) return;

      const confirmBtn = document.getElementById("bookingEditConfirmBtn");
      if (confirmBtn) confirmBtn.disabled = true;

      try {
        const body = readBookingEditForm();
        await patchGuestBooking(pendingEditBookingId, body);

        closeModal("bookingEditModal");
        window.showToast?.("A foglalás mentve.", "success");
        await reloadBookings();
      } catch (error) {
        window.showToast?.(error.message || "Mentés sikertelen.", "error");
      } finally {
        if (confirmBtn) confirmBtn.disabled = false;
        pendingEditBookingId = null;
      }
    }

    /** lemondás */
    function openCancelModal(bookingId) {
      const booking = findBooking(bookingId);
      if (!booking?.can_cancel) return;

      pendingCancelBookingId = booking.id;
      const body = document.getElementById("bookingCancelText");
      if (body) {
        const date = window.formatHuDate?.(booking.date) ?? booking.date;
        const time = formatTime(booking.time);
        body.textContent = `Biztosan lemondod a ${date} ${time} időpontra szóló foglalást? A művelet nem vonható vissza.`;
      }
      openModal("bookingCancelModal");
    }

    async function confirmCancelBooking() {
      if (!pendingCancelBookingId) return;

      const confirmBtn = document.getElementById("bookingCancelConfirmBtn");
      if (confirmBtn) confirmBtn.disabled = true;

      try {
        const response = await apiRequest(
          `/api/guest-portal/reservations/${pendingCancelBookingId}/cancel/`,
          { method: "POST" },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getApiErrorMessage(data));
        }

        closeModal("bookingCancelModal");
        window.showToast?.("A foglalás lemondva.", "success");
        await reloadBookings();
      } catch (error) {
        window.showToast?.(error.message || "Lemondás sikertelen.", "error");
      } finally {
        if (confirmBtn) confirmBtn.disabled = false;
        pendingCancelBookingId = null;
      }
    }

    function bindBookingsEvents() {
      document.querySelectorAll(".gp-bookings-tab").forEach((tab) => {
        tab.addEventListener("click", () => switchBookingsTab(tab.dataset.scope));
      });

      document.getElementById("bookingsLoadMoreBtn")?.addEventListener("click", loadMoreBookings);

      const listEl = document.getElementById("bookingsList");
      listEl?.addEventListener("click", (event) => {
        const toggle = event.target.closest(".gp-booking-card-toggle, .gp-booking-row-toggle");
        if (toggle) {
          const container = toggle.closest(".gp-booking-card, .gp-booking-row");
          const bookingId = Number(container?.dataset.bookingId);
          if (!container || !bookingId) return;
          setBookingExpanded(container, bookingId, !container.classList.contains("is-expanded"));
          return;
        }

        const cancelBtn = event.target.closest(".gp-booking-cancel-btn");
        if (cancelBtn) {
          openCancelModal(cancelBtn.dataset.id);
          return;
        }

        const editBtn = event.target.closest(".gp-booking-edit-btn");
        if (editBtn) {
          openEditModal(editBtn.dataset.id);
        }
      });

      // Dátum váltás → időpont lista (nyitvatartás szerint)
      document.getElementById("bookingEditDate")?.addEventListener("change", () => {
        refreshBookingEditTimeSelect();
      });

      document.getElementById("bookingEditCancelBtn")?.addEventListener("click", () => {
        pendingEditBookingId = null;
        closeModal("bookingEditModal");
      });
      document.getElementById("bookingEditConfirmBtn")?.addEventListener("click", confirmEditBooking);
      document.getElementById("bookingEditModal")?.addEventListener("click", (event) => {
        if (event.target.id === "bookingEditModal") {
          pendingEditBookingId = null;
          closeModal("bookingEditModal");
        }
      });

      document.getElementById("bookingCancelCancelBtn")?.addEventListener("click", () => {
        pendingCancelBookingId = null;
        closeModal("bookingCancelModal");
      });
      document.getElementById("bookingCancelConfirmBtn")?.addEventListener("click", confirmCancelBooking);
      document.getElementById("bookingCancelModal")?.addEventListener("click", (event) => {
        if (event.target.id === "bookingCancelModal") {
          pendingCancelBookingId = null;
          closeModal("bookingCancelModal");
        }
      });
    }

    //  index.js hívja — események + betöltés + nyitvatartás (szerkesztő időpontokhoz)
    function initBookingsSection() {
      const root = document.getElementById("bookingsRoot");
      if (!root) return;

      bindBookingsEvents();

      // Nyitvatartás betöltése — szerkesztő modál időpont listájához
      window.OpeningHours?.fetchOpeningHours?.().catch((error) => {
        console.warn("Nyitvatartás betöltése (foglalás szerkesztés):", error);
      });

      loadBookings({ reset: true });
    }

    window.initBookingsSection = initBookingsSection;
    window.reloadGuestBookings = reloadGuestBookings;
})();
