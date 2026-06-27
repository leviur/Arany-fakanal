const Messages = (() => {

  /* ================= KONFIG ================= */
  const STORAGE_KEY = "aranyfakanal_inbox";
  const MESSAGE_TYPES = ["Foglalás", "Visszajelzés", "Általános kérdés", "Egyéb"];
  const TYPE_TO_CLASS = {
    "Foglalás": "msg-type-foglalas",
    "Visszajelzés": "msg-type-visszajelzes",
    "Általános kérdés": "msg-type-altalanos",
    "Egyéb": "msg-type-egyeb",
  };

  /* ================= STATE ================= */
  let activeArchiveTab = "active";
  let activeKpiFilter = null;
  let selectedMessageId = null;
  let sortDir = "newest";
  let messagesEventsBound = false;
  let inboxLoaded = false;

  /* ================= DEMO ADATOK ================= */
  const demoMessages = [
    { id: 1, name: "Kovács Anna", email: "anna.kovacs@gmail.com", subject: "Asztalfoglalás módosítása", message: "Szeretném módosítani a pénteki foglalásomat 18:00-ról 19:30-ra. Kérem visszaigazolni, hogy lehetséges-e.", date: "2026-06-01 10:15", type: "Foglalás", read: false, archived: false },
    { id: 2, name: "Nagy Péter", email: "peter.nagy@gmail.com", subject: "Étel allergia kérdés", message: "Érdeklődnék, hogy a menü tartalmaz-e glutént vagy laktózt, mivel ételallergiám van.", date: "2026-06-01 12:40", type: "Általános kérdés", read: false, archived: false },
    { id: 3, name: "Szabó Luca", email: "luca.szabo@gmail.com", subject: "Pozitív visszajelzés", message: "Nagyon finom volt az étel és a kiszolgálás is kiváló. Biztosan visszatérünk még a családdal!", date: "2026-06-02 18:22", type: "Visszajelzés", read: false, archived: false },
    { id: 4, name: "Tóth Máté", email: "mate.toth@gmail.com", subject: "Számla kérés", message: "Szükségem lenne a tegnapi rendelésről egy számlára, céges elszámoláshoz.", date: "2026-06-02 09:10", type: "Egyéb", read: false, archived: false },
    { id: 5, name: "Horváth Réka", email: "reka.horvath@gmail.com", subject: "Hosszabb visszajelzés az étteremről", message: "Többször jártunk már Önöknél, és minden alkalommal nagyon elégedettek voltunk. Az ételek mindig frissek és ízletesek. A személyzet figyelmes, a hangulat pedig kiváló.", date: "2026-06-03 20:05", type: "Visszajelzés", read: false, archived: false },
    { id: 6, name: "Kiss Dániel", email: "daniel.kiss@gmail.com", subject: "Rendezvény érdeklődés", message: "Esküvői vacsorát szeretnénk szervezni kb. 40 főre. Van erre lehetőség az étteremben?", date: "2026-06-03 14:33", type: "Foglalás", read: false, archived: false },
    { id: 7, name: "Varga Eszter", email: "eszter.varga@gmail.com", subject: "Reklamáció", message: "A tegnapi étel hidegen érkezett, és a köret sajnos túl sós volt.", date: "2026-06-04 11:20", type: "Visszajelzés", read: false, archived: false },
    { id: 8, name: "Fekete Balázs", email: "balazs.fekete@gmail.com", subject: "Nyitvatartás", message: "Ünnepnapokon is nyitva vannak?", date: "2026-06-04 08:50", type: "Általános kérdés", read: false, archived: false },
    { id: 9, name: "Molnár Zsófia", email: "zsofia.molnar@gmail.com", subject: "Hosszú élménybeszámoló", message: "Nagyon kellemes este volt az étteremben. A hangulat, a zene és a világítás is tökéletes volt. Az ételek kifogástalanok voltak, a desszertek különösen emlékezetesek. A személyzet figyelmes volt, de nem tolakodó.", date: "2026-06-05 21:18", type: "Visszajelzés", read: false, archived: false },
    { id: 10, name: "Juhász Roland", email: "roland.juhasz@gmail.com", subject: "Asztalfoglalás", message: "Szombatra szeretnék asztalt 4 főre 19:00-ra.", date: "2026-06-05 13:05", type: "Foglalás", read: false, archived: false },
    { id: 11, name: "Simon Tamás", email: "tamas.simon@gmail.com", subject: "Vegetáriánus opció", message: "Van vegetáriánus étel az étlapon?", date: "2026-06-06 16:45", type: "Általános kérdés", read: false, archived: false },
    { id: 12, name: "Németh Kinga", email: "kinga.nemeth@gmail.com", subject: "Köszönet", message: "Köszönjük a vendéglátást, minden fantasztikus volt!", date: "2026-06-06 19:30", type: "Visszajelzés", read: false, archived: false },
    { id: 13, name: "Barna Dávid", email: "david.barna@gmail.com", subject: "Helyszín érdeklődés", message: "Érdeklődnék, hogy nagyobb céges rendezvényeket is tudnak-e fogadni 60-80 fővel.", date: "2026-06-07 10:10", type: "Foglalás", read: false, archived: false },
    { id: 14, name: "Tóth Zsuzsa", email: "zsuzsa.toth@gmail.com", subject: "Étel kérdés", message: "Tartalmaz a halászlé glutént?", date: "2026-06-07 11:25", type: "Általános kérdés", read: false, archived: false },
    { id: 15, name: "Papp Gábor", email: "gabor.papp@gmail.com", subject: "Hosszabb visszajelzés", message: "Az étterem hangulata nagyon kellemes volt, a kiszolgálás gyors és figyelmes. Az ételek ízletesek voltak, különösen a steak és a desszertek. Biztosan visszatérünk még a jövőben.", date: "2026-06-07 18:40", type: "Visszajelzés", read: false, archived: false },
    { id: 16, name: "Kiss Réka", email: "r.kiss@gmail.com", subject: "Foglalás módosítás", message: "A holnapi foglalásomat szeretném 1 órával későbbre módosítani.", date: "2026-06-08 09:00", type: "Foglalás", read: false, archived: false },
    { id: 17, name: "Horváth László", email: "laszlo.horvath@gmail.com", subject: "Rövid kérdés", message: "Van parkolási lehetőség az étteremnél?", date: "2026-06-08 12:15", type: "Általános kérdés", read: false, archived: false },
    { id: 18, name: "Farkas Anna", email: "anna.farkas@gmail.com", subject: "Késés jelzés", message: "10-15 percet késünk a foglalásról, ez probléma?", date: "2026-06-08 17:20", type: "Foglalás", read: false, archived: false },
    { id: 19, name: "Molnár Péter", email: "peter.molnar@gmail.com", subject: "Nagyon hosszú visszajelzés az élményről", message: "Az éttermi élményünk kiváló volt. A kiszolgálás gyors, az ételek frissek és ízletesek voltak. A hangulat nagyon barátságos, a személyzet pedig végig figyelmes volt. Külön kiemelném a desszerteket, amelyek igazán különlegesek voltak. Ritkán találkozni ilyen magas színvonalú vendéglátással, ezért biztosan visszatérünk még több alkalommal is a jövőben.", date: "2026-06-09 19:45", type: "Visszajelzés", read: false, archived: false },
    { id: 20, name: "Szilágyi Erika", email: "erika.sz@gmail.com", subject: "Asztalfoglalás", message: "Kérek egy asztalt 2 főre péntek estére 18:30-ra.", date: "2026-06-09 14:10", type: "Foglalás", read: false, archived: false },
  ];

  /* ================= SEGÉDFÜGGVÉNYEK ================= */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatShortDate(dateStr) {
    const [datePart, timePart] = dateStr.split(" ");
    const [, month, day] = datePart.split("-");
    return `${month}.${day}. ${timePart}`;
  }

  /* ================= INBOX BETÖLTÉS (localStorage híd) ================= */
  function loadInboxFromStorage() {
    if (inboxLoaded) return;
    inboxLoaded = true;

    let incoming = [];
    try {
      incoming = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      incoming = [];
    }

    incoming.forEach(m => {
      if (m && typeof m.id !== "undefined" && !demoMessages.some(existing => existing.id === m.id)) {
        demoMessages.unshift(m);
      }
    });
  }

  function getMessages() {
    return demoMessages;
  }

  /* ================= SZŰRÉS / RENDEZÉS ================= */
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

    let list = demoMessages.filter(m => {
      if (!matchesArchiveTab(m)) return false;
      // a megnyitott üzenet marad látható a listában, még ha a megnyitás (olvasottá válás / típusváltás)
      // miatt már nem felelne meg az aktív KPI-szűrőnek — különben minden kattintásra ugrálna a lista
      if (m.id !== selectedMessageId && !matchesKpiFilter(m)) return false;
      if (!search) return true;
      return (
        m.name.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search) ||
        m.subject.toLowerCase().includes(search) ||
        m.message.toLowerCase().includes(search)
      );
    });

    list = [...list].sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date);
      return sortDir === "newest" ? -diff : diff;
    });

    return list;
  }

  /* ================= LISTA RENDER ================= */
  function createListRow(m) {
    const typeClass = TYPE_TO_CLASS[m.type] || "msg-type-egyeb";
    const unreadClass = m.read ? "" : " unread";
    const selectedClass = m.id === selectedMessageId ? " selected" : "";
    const dot = m.read ? "" : `<span class="msg-row-dot"></span>`;

    return `
      <div class="msg-list-row${unreadClass}${selectedClass}" data-id="${m.id}">
        <div class="msg-row-top">
          <span class="msg-row-name">${dot}${escapeHtml(m.name)}</span>
          <span class="msg-row-date">${formatShortDate(m.date)}</span>
        </div>
        <div class="msg-row-subject">${escapeHtml(m.subject)}</div>
        <div class="msg-row-meta">
          <span class="msg-type-chip ${typeClass}">${escapeHtml(m.type)}</span>
        </div>
      </div>`;
  }

  function renderList() {
    const listEl = document.getElementById("messagesList");
    if (!listEl) return;

    const list = getFilteredSorted();

    if (!list.length) {
      const search = document.getElementById("messagesSearch")?.value || "";
      const hasAnyBeforeSearch = demoMessages.some(m => matchesArchiveTab(m) && matchesKpiFilter(m));
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

  /* ================= RÉSZLET RENDER ================= */
  function renderDetail() {
    const detailEl = document.getElementById("messagesDetail");
    if (!detailEl) return;

    const message = demoMessages.find(m => m.id === selectedMessageId);

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
    const initials = message.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
    const mailtoHref = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent("Re: " + message.subject)}`;

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
        <div class="msg-detail-date">${message.date}</div>
      </div>
      <button type="button" class="msg-type-badge ${typeClass}" data-id="${message.id}">
        ${escapeHtml(message.type)} <i class="fa-solid fa-chevron-down"></i>
      </button>
      <div class="msg-detail-subject">${escapeHtml(message.subject)}</div>
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
      </div>`;
  }

  /* ================= KPI RENDER ================= */
  function renderKpis() {
    const visible = demoMessages.filter(matchesArchiveTab);
    const counts = { unread: 0, "Foglalás": 0, "Visszajelzés": 0, "Általános kérdés": 0, "Egyéb": 0 };

    visible.forEach(m => {
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

  function renderAll() {
    renderList();
    renderDetail();
    renderKpis();
  }

  /* ================= TÍPUS POPOVER ================= */
  function openTypePopover(badge) {
    closeTypePopover();
    const id = Number(badge.dataset.id);
    const message = demoMessages.find(m => m.id === id);
    if (!message) return;

    const pop = document.createElement("div");
    pop.id = "message-type-popover";

    MESSAGE_TYPES.forEach(type => {
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

  /* ================= MUTÁCIÓK ================= */
  function markRead(id, read) {
    const message = demoMessages.find(m => m.id === id);
    if (message) message.read = read;
  }

  function setType(id, type) {
    const message = demoMessages.find(m => m.id === id);
    if (message) message.type = type;
  }

  function toggleArchive(id) {
    const message = demoMessages.find(m => m.id === id);
    if (!message) return;

    message.archived = !message.archived;
    if (selectedMessageId === id) selectedMessageId = null;

    renderAll();
    window.refreshDashboard?.();

    if (message.archived) {
      window.showToast?.("Üzenet archiválva", "success", {
        actionLabel: "Visszavonás",
        onAction: () => toggleArchive(id),
      });
    } else {
      window.showToast?.("Üzenet visszaállítva", "success");
    }
  }

  /* ================= RENDEZÉS GOMB ================= */
  function updateSortLabel() {
    const label = document.getElementById("messagesSortLabel");
    if (label) label.textContent = sortDir === "newest" ? "Legújabb" : "Legrégebbi";
  }

  /* ================= KATTINTÁS-KEZELŐ (delegált) ================= */
  function handleMessagesClick(e) {
    const typeOpt = e.target.closest(".message-type-popover-option");
    if (typeOpt) {
      setType(Number(typeOpt.dataset.messageId), typeOpt.dataset.type);
      closeTypePopover();
      renderAll();
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
        document.querySelectorAll(".msg-archive-tab").forEach(t => {
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
        document.querySelectorAll(".msg-kpi").forEach(k => {
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
      const message = demoMessages.find(m => m.id === id);
      if (message) markRead(id, !message.read);
      renderAll();
      window.refreshDashboard?.();
      return;
    }

    const archiveBtn = e.target.closest('[data-action="toggle-archive"]');
    if (archiveBtn) {
      toggleArchive(Number(archiveBtn.dataset.id));
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
      const message = demoMessages.find(m => m.id === id);
      if (message && !message.read) markRead(id, true);
      renderAll();
      window.refreshDashboard?.();
      document.getElementById("messagesDetail")?.classList.add("is-open");
    }
  }

  /* ================= BIND EVENTS (egyszer) ================= */
  function bindEvents() {
    if (messagesEventsBound) return;
    messagesEventsBound = true;

    document.addEventListener("click", handleMessagesClick);

    document.getElementById("messagesSearch")?.addEventListener("input", () => {
      renderList();
    });
  }

  /* ================= PUBLIC API ================= */
  function render(animate) {
    loadInboxFromStorage();
    bindEvents();

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

  return { render, getMessages };

})();
