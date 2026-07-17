/**********************
 * ÜZENETEK — dashboard inbox
 *
 * Adat: GET /api/contact/ (admin)
 * Módosítás: PATCH /api/contact/<id>/ — olvasott, archivált, típus
 **********************/

const Messages = (() => {
  const MESSAGE_TYPES = ["Foglalás", "Visszajelzés", "Általános kérdés", "Egyéb"];
  const TYPE_TO_CLASS = {
    "Foglalás": "msg-type-foglalas",
    "Visszajelzés": "msg-type-visszajelzes",
    "Általános kérdés": "msg-type-altalanos",
    "Egyéb": "msg-type-egyeb",
  };

  let messages = [];
  let activeArchiveTab = "active";
  let activeKpiFilter = null;
  let selectedMessageId = null;
  let sortDir = "newest";
  let messagesEventsBound = false;
  let isLoading = false;
  let isReady = false;
  let pendingDeleteId = null;

  function findMessage(id) {
    const numId = Number(id);
    return messages.find((m) => m.id === numId || String(m.id) === String(id));
  }

  function syncAppData() {
    window.appData = window.appData || {};
    window.appData.messages = messages;
  }

  /** API lista → memória (mezők már dashboard formátumban jönnek) */
  async function loadMessagesFromApi() {
    const response = await apiRequest("/api/contact/");
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw err;
    }
    messages = await response.json();
    isReady = true;
    syncAppData();
    return messages;
  }

  /** Sikeres PATCH után helyi állapot + újrarenderelés */
  function applyMessageUpdate(apiMessage, { refreshDashboard = false } = {}) {
    const index = messages.findIndex((m) => m.id === apiMessage.id);
    if (index !== -1) {
      messages[index] = apiMessage;
    } else {
      messages.unshift(apiMessage);
    }
    syncAppData();
    renderAll();
    if (refreshDashboard) {
      window.refreshDashboard?.();
    }
  }

  function removeMessage(messageId, { refreshDashboard = false } = {}) {
    messages = messages.filter((m) => m.id !== messageId);
    if (selectedMessageId === messageId) {
      selectedMessageId = null;
    }
    syncAppData();
    renderAll();
    if (refreshDashboard) {
      window.refreshDashboard?.();
    }
  }

  async function patchMessage(id, body) {
    const response = await apiRequest(`/api/contact/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw err;
    }
    return response.json();
  }

  async function updateMessage(id, body, { refreshDashboard = false } = {}) {
    try {
      const updated = await patchMessage(id, body);
      applyMessageUpdate(updated, { refreshDashboard });
      return updated;
    } catch (err) {
      console.error("Üzenet mentése sikertelen:", err);
      const message = typeof parseApiError === "function"
        ? parseApiError(err, "Üzenet mentése sikertelen")
        : "Üzenet mentése sikertelen";
      window.showToast?.(message, "error");
      throw err;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return "";
    const [datePart, timePart] = dateStr.split(" ");
    if (!datePart) return dateStr;
    const [, month, day] = datePart.split("-");
    return timePart ? `${month}.${day}. ${timePart}` : `${month}.${day}.`;
  }

  function getMessages() {
    return messages;
  }

  function matchesArchiveTab(m) {
    return activeArchiveTab === "archived" ? m.archived : !m.archived;
  }

  function matchesKpiFilter(m) {
    if (!activeKpiFilter) return true;
    if (activeKpiFilter === "unread") return !m.read;
    return m.type === activeKpiFilter;
  }

  function getFilteredSorted() {
    const search = (document.getElementById("messagesSearch")?.value || "").toLowerCase();

    let list = messages.filter((m) => {
      if (!matchesArchiveTab(m)) return false;
      if (m.id !== selectedMessageId && !matchesKpiFilter(m)) return false;
      if (!search) return true;
      return (
        m.name.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search) ||
        (m.subject || "").toLowerCase().includes(search) ||
        m.message.toLowerCase().includes(search)
      );
    });

    list = [...list].sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date);
      return sortDir === "newest" ? -diff : diff;
    });

    return list;
  }

  function createListRow(m) {
    const typeClass = TYPE_TO_CLASS[m.type] || "msg-type-egyeb";
    const unreadClass = m.read ? "" : " unread";
    const selectedClass = m.id === selectedMessageId ? " selected" : "";
    const dot = m.read ? "" : `<span class="msg-row-dot"></span>`;
    const subject = m.subject?.trim() ? m.subject : "(Nincs tárgy)";

    return `
      <div class="msg-list-row${unreadClass}${selectedClass}" data-id="${m.id}">
        <div class="msg-row-top">
          <span class="msg-row-name">${dot}${escapeHtml(m.name)}</span>
          <span class="msg-row-date">${formatShortDate(m.date)}</span>
        </div>
        <div class="msg-row-subject">${escapeHtml(subject)}</div>
        <div class="msg-row-meta">
          <span class="msg-type-chip ${typeClass}">${escapeHtml(m.type)}</span>
        </div>
      </div>`;
  }

  function renderList() {
    const listEl = document.getElementById("messagesList");
    if (!listEl) return;

    if (isLoading) {
      listEl.innerHTML = `
        <div class="msg-empty-state">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <p>Betöltés...</p>
        </div>`;
      return;
    }

    const list = getFilteredSorted();

    if (!list.length) {
      const search = document.getElementById("messagesSearch")?.value || "";
      const hasAnyBeforeSearch = messages.some((m) => matchesArchiveTab(m) && matchesKpiFilter(m));
      let text = "Nincs üzenet";
      if (search && hasAnyBeforeSearch) text = "Nincs találat";
      else if (activeArchiveTab === "archived") text = "Nincs archivált üzenet";

      listEl.innerHTML = `
        <div class="msg-empty-state">
          <i class="fa-solid ${search ? "fa-magnifying-glass" : "fa-inbox"}"></i>
          <p>${text}</p>
        </div>`;
      return;
    }

    listEl.innerHTML = list.map(createListRow).join("");
  }

  function renderDetail() {
    const detailEl = document.getElementById("messagesDetail");
    if (!detailEl) return;

    const message = findMessage(selectedMessageId);

    if (!message) {
      detailEl.classList.remove("is-open");
      detailEl.innerHTML = `
        <div class="msg-empty-state">
          <i class="fa-solid fa-envelope-open-text"></i>
          <p>Válassz egy üzenetet a listából</p>
        </div>`;
      return;
    }

    const typeClass = TYPE_TO_CLASS[message.type] || "msg-type-egyeb";
    const initials = message.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    const subject = message.subject?.trim() ? message.subject : "(Nincs tárgy)";
    const mailtoHref = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent("Re: " + subject)}`;

    detailEl.innerHTML = `
      <button type="button" class="msg-detail-back" data-action="back">
        <i class="fa-solid fa-arrow-left"></i> Vissza a listához
      </button>
      <div class="msg-detail-header">
        <div class="msg-detail-avatar">${escapeHtml(initials)}</div>
        <div class="msg-detail-who">
          <div class="msg-detail-name">${escapeHtml(message.name)}</div>
          <div class="msg-detail-email">${escapeHtml(message.email)}</div>
        </div>
        <div class="msg-detail-date">${escapeHtml(message.date)}</div>
      </div>
      <button type="button" class="msg-type-badge ${typeClass}" data-id="${message.id}">
        ${escapeHtml(message.type)} <i class="fa-solid fa-chevron-down"></i>
      </button>
      <div class="msg-detail-subject">${escapeHtml(subject)}</div>
      <div class="msg-detail-text">${escapeHtml(message.message)}</div>
      <div class="msg-detail-actions">
        <a class="msg-btn-reply" href="${mailtoHref}">
          <i class="fa-solid fa-reply"></i> Válasz emailben
        </a>
        <button type="button" class="msg-btn-secondary" data-action="toggle-read" data-id="${message.id}">
          ${message.read ? "Jelöld olvasatlannak" : "Jelöld olvasottnak"}
        </button>
        <button type="button" class="msg-btn-secondary msg-btn-archive" data-action="toggle-archive" data-id="${message.id}">
          ${message.archived ? "Visszaállítás" : "Archiválás"}
        </button>
        <button type="button" class="msg-btn-secondary btn-danger" data-action="delete" data-id="${message.id}">
          <i class="fa-solid fa-trash"></i> Törlés
        </button>
      </div>`;
  }

  function renderKpis() {
    const visible = messages.filter(matchesArchiveTab);
    const counts = { unread: 0, "Foglalás": 0, "Visszajelzés": 0, "Általános kérdés": 0, "Egyéb": 0 };

    visible.forEach((m) => {
      if (!m.read) counts.unread++;
      if (counts[m.type] !== undefined) counts[m.type]++;
    });

    const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setKpi("kpi-messages-unread", counts.unread);
    setKpi("kpi-messages-foglalas", counts["Foglalás"]);
    setKpi("kpi-messages-visszajelzes", counts["Visszajelzés"]);
    setKpi("kpi-messages-altalanos", counts["Általános kérdés"]);
    setKpi("kpi-messages-egyeb", counts["Egyéb"]);
  }

  // Lista + részletek + KPI sor együtt
  function renderAll() {
    renderList();
    renderDetail();
    renderKpis();
  }

  function openTypePopover(badge) {
    closeTypePopover();
    const id = Number(badge.dataset.id);
    const message = findMessage(id);
    if (!message) return;

    const pop = document.createElement("div");
    pop.id = "message-type-popover";

    MESSAGE_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `message-type-popover-option ${TYPE_TO_CLASS[type]}${message.type === type ? " current" : ""}`;
      btn.dataset.type = type;
      btn.dataset.messageId = id;
      btn.textContent = type;
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
      let top = rect.bottom + 6;

      if (left + popW > vw - 8) left = vw - popW - 8;
      if (top + popH > vh - 8) top = rect.top - popH - 6;

      pop.style.left = `${left}px`;
      pop.style.top = `${top}px`;
    });
  }

  function closeTypePopover() {
    document.getElementById("message-type-popover")?.remove();
  }

  async function toggleArchive(id) {
    const message = findMessage(id);
    if (!message) return;

    const nextArchived = !message.archived;

    try {
      const updated = await patchMessage(id, { archived: nextArchived });
      if (selectedMessageId === id && nextArchived) {
        selectedMessageId = null;
      }
      applyMessageUpdate(updated, { refreshDashboard: true });

      if (nextArchived) {
        window.showToast?.("Üzenet archiválva", "success", {
          actionLabel: "Visszavonás",
          onAction: () => toggleArchive(id),
        });
      } else {
        window.showToast?.("Üzenet visszaállítva", "success");
      }
    } catch (_err) {
    }
  }

  function openMessageDeleteConfirm(id) {
    pendingDeleteId = id;
    const modal = document.getElementById("messageDeleteConfirmModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeMessageDeleteConfirm() {
    const modal = document.getElementById("messageDeleteConfirmModal");
    if (!modal) return;
    modal.classList.remove("open");
    setTimeout(() => modal.classList.add("hidden"), 150);
    pendingDeleteId = null;
  }

  async function confirmMessageDelete() {
    if (!pendingDeleteId) return;

    const messageId = pendingDeleteId;

    try {
      const response = await apiRequest(`/api/contact/${messageId}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = typeof readApiErrorMessage === "function"
          ? await readApiErrorMessage(response, "Törlés sikertelen")
          : "Törlés sikertelen";
        window.showToast?.(message, "error");
        return;
      }

      closeMessageDeleteConfirm();
      removeMessage(messageId, { refreshDashboard: true });
      window.showToast?.("Üzenet törölve", "deleted");
    } catch (err) {
      console.error("Üzenet törlés sikertelen:", err);
      window.showToast?.("Törlés sikertelen", "error");
    }
  }

  function updateSortLabel() {
    const label = document.getElementById("messagesSortLabel");
    if (label) label.textContent = sortDir === "newest" ? "Legújabb" : "Legrégebbi";
  }

  function handleMessagesClick(e) {
    const typeOpt = e.target.closest(".message-type-popover-option");
    if (typeOpt) {
      const id = Number(typeOpt.dataset.messageId);
      const type = typeOpt.dataset.type;
      closeTypePopover();
      void updateMessage(id, { type });
      return;
    }

    if (!e.target.closest("#message-type-popover") && !e.target.closest(".msg-type-badge")) {
      closeTypePopover();
    }

    const archiveTab = e.target.closest(".msg-archive-tab");
    if (archiveTab) {
      const tab = archiveTab.dataset.archive;
      if (tab !== activeArchiveTab) {
        activeArchiveTab = tab;
        selectedMessageId = null;
        document.querySelectorAll(".msg-archive-tab").forEach((t) => {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        archiveTab.classList.add("active");
        archiveTab.setAttribute("aria-selected", "true");
        renderAll();
      }
      return;
    }

    const sortBtn = e.target.closest("#messagesSortBtn");
    if (sortBtn) {
      sortDir = sortDir === "newest" ? "oldest" : "newest";
      updateSortLabel();
      renderList();
      return;
    }

    const kpiBtn = e.target.closest(".msg-kpi");
    if (kpiBtn) {
      const filter = kpiBtn.dataset.filter;
      if (activeKpiFilter === filter) {
        activeKpiFilter = null;
        kpiBtn.setAttribute("aria-pressed", "false");
        kpiBtn.classList.remove("active");
      } else {
        activeKpiFilter = filter;
        document.querySelectorAll(".msg-kpi").forEach((k) => {
          k.setAttribute("aria-pressed", "false");
          k.classList.remove("active");
        });
        kpiBtn.setAttribute("aria-pressed", "true");
        kpiBtn.classList.add("active");
      }
      renderList();
      renderDetail();
      return;
    }

    const typeBadge = e.target.closest(".msg-type-badge");
    if (typeBadge) {
      openTypePopover(typeBadge);
      return;
    }

    const readBtn = e.target.closest('[data-action="toggle-read"]');
    if (readBtn) {
      const id = Number(readBtn.dataset.id);
      const message = findMessage(id);
      if (message) {
        void updateMessage(id, { read: !message.read }, { refreshDashboard: true });
      }
      return;
    }

    const archiveBtn = e.target.closest('[data-action="toggle-archive"]');
    if (archiveBtn) {
      void toggleArchive(Number(archiveBtn.dataset.id));
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (deleteBtn) {
      openMessageDeleteConfirm(Number(deleteBtn.dataset.id));
      return;
    }

    const backBtn = e.target.closest('[data-action="back"]');
    if (backBtn) {
      document.getElementById("messagesDetail")?.classList.remove("is-open");
      return;
    }

    const row = e.target.closest(".msg-list-row");
    if (row) {
      const id = Number(row.dataset.id);
      selectedMessageId = id;
      const message = findMessage(id);
      if (message && !message.read) {
        void updateMessage(id, { read: true }, { refreshDashboard: true }).then(() => {
          document.getElementById("messagesDetail")?.classList.add("is-open");
        });
      } else {
        renderAll();
        document.getElementById("messagesDetail")?.classList.add("is-open");
      }
    }
  }

  function bindEvents() {
    if (messagesEventsBound) return;
    messagesEventsBound = true;

    document.addEventListener("click", handleMessagesClick);

    document.getElementById("messagesSearch")?.addEventListener("input", () => {
      renderList();
    });

    document.getElementById("messageDeleteConfirmOk")
      ?.addEventListener("click", confirmMessageDelete);
    document.getElementById("messageDeleteConfirmCancel")
      ?.addEventListener("click", closeMessageDeleteConfirm);
    document.getElementById("messageDeleteConfirmModal")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "messageDeleteConfirmModal") closeMessageDeleteConfirm();
      });
  }

  // API újratöltés + teljes inbox újrarajz
  async function refresh() {
    await loadMessagesFromApi();
    renderAll();
  }

  // Első betöltés (App.init): események + GET /api/contact/
  async function render(animate = false) {
    bindEvents();
    isLoading = true;
    renderList();

    try {
      await loadMessagesFromApi();
    } catch (err) {
      console.error("Üzenetek betöltése sikertelen:", err);
      messages = [];
      syncAppData();
      window.showToast?.("Nem sikerült betölteni az üzeneteket.", "error");
    } finally {
      isLoading = false;
    }

    if (animate && typeof fadeRender === "function") {
      const kpiRow = document.getElementById("messagesKpiRow");
      const listEl = document.getElementById("messagesList");
      if (kpiRow) fadeRender(kpiRow, renderKpis); else renderKpis();
      if (listEl) fadeRender(listEl, renderList); else renderList();
      renderDetail();
      return;
    }

    renderAll();
  }

  return {
    render,
    refresh,
    getMessages,
    loadMessagesFromApi,
  };
})();

window.Messages = Messages;
