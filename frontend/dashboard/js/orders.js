const demoOrders = [
  { id: "001", name: "Kiss János", phone: "+36 30 222 3344", address: "Szilváskút, Fő utca 12.", menu: "A menü", qty: 2, createdAt: "2026.06.07 09:45", status: "Új", statusChangedAt: "" },
  { id: "002", name: "Dr. Károlyi-Fekete Emese Krisztina", phone: "+36 20 987 6543", address: "Szilváskút, Petőfi utca 8.", menu: "B menü", qty: 1, createdAt: "2026.06.07 09:50", status: "Új", statusChangedAt: "" },
  { id: "003", name: "Tóth Béla", phone: "+36 70 555 1122", address: "Szilváskút, Béke tér 3.", menu: "A menü", qty: 3, createdAt: "2026.06.07 09:55", status: "Új", statusChangedAt: "" },
  { id: "004", name: "Szabó-Kovácsné Nagy Eszter Julianna", phone: "+36 30 888 2211", address: "Szilváskút, Domb utca 15.", menu: "B menü", qty: 2, createdAt: "2026.06.07 10:00", status: "Új", statusChangedAt: "" },
  { id: "005", name: "Kovács Péter", phone: "+36 30 456 7890", address: "Szilváskút, Rákóczi utca 4.", menu: "A menü", qty: 1, createdAt: "2026.06.07 10:05", status: "Új", statusChangedAt: "" },
  { id: "006", name: "Varga Eszter", phone: "+36 20 321 6547", address: "Szilváskút, Arany János utca 9.", menu: "B menü", qty: 2, createdAt: "2026.06.07 10:10", status: "Új", statusChangedAt: "" },
  { id: "007", name: "Ifj. Molnár Zoltán Sándor", phone: "+36 70 789 1234", address: "Szilváskút, Kossuth tér 1.", menu: "A menü", qty: 4, createdAt: "2026.06.07 10:15", status: "Új", statusChangedAt: "" },
  { id: "008", name: "Farkas Andrea", phone: "+36 30 654 9871", address: "Szilváskút, Akácfa utca 22.", menu: "B menü", qty: 1, createdAt: "2026.06.07 10:20", status: "Új", statusChangedAt: "" },
  { id: "009", name: "Horváth Gábor", phone: "+36 20 777 8899", address: "Szilváskút, Táncsics utca 17.", menu: "A menü", qty: 2, createdAt: "2026.06.07 10:25", status: "Új", statusChangedAt: "" },
  { id: "010", name: "Balogh Katalin", phone: "+36 70 112 3344", address: "Szilváskút, Hársfa utca 6.", menu: "B menü", qty: 3, createdAt: "2026.06.07 10:30", status: "Új", statusChangedAt: "" },
  { id: "011", name: "Lakatos Imre", phone: "+36 30 998 7766", address: "Szilváskút, Iskola köz 2.", menu: "A menü", qty: 1, createdAt: "2026.06.07 10:35", status: "Új", statusChangedAt: "" },
  { id: "012", name: "Papp Viktória", phone: "+36 20 443 2211", address: "Szilváskút, Diófa utca 14.", menu: "B menü", qty: 2, createdAt: "2026.06.07 10:40", status: "Új", statusChangedAt: "" },
  { id: "013", name: "Németh Ádám István", phone: "+36 30 551 7788", address: "Szilváskút, Fenyő utca 5.", menu: "A menü", qty: 2, createdAt: "2026.06.07 10:45", status: "Új", statusChangedAt: "" },
  { id: "014", name: "Oláh Zsófia", phone: "+36 20 665 3322", address: "Szilváskút, Jókai utca 18.", menu: "B menü", qty: 1, createdAt: "2026.06.07 10:50", status: "Új", statusChangedAt: "" },
  { id: "015", name: "Gulyás Tamás", phone: "+36 70 221 5544", address: "Szilváskút, Vörösmarty utca 11.", menu: "A menü", qty: 4, createdAt: "2026.06.07 10:55", status: "Új", statusChangedAt: "" },
  { id: "016", name: "Takács Éva", phone: "+36 30 441 2233", address: "Szilváskút, Mátyás király utca 7.", menu: "B menü", qty: 2, createdAt: "2026.06.07 11:00", status: "Új", statusChangedAt: "" },
  { id: "017", name: "Simon Krisztián Gábor", phone: "+36 20 887 6655", address: "Szilváskút, Sport utca 20.", menu: "A menü", qty: 1, createdAt: "2026.06.07 11:05", status: "Új", statusChangedAt: "" },
  { id: "018", name: "Boros Dóra", phone: "+36 70 332 1188", address: "Szilváskút, Tölgyfa utca 13.", menu: "B menü", qty: 3, createdAt: "2026.06.07 11:10", status: "Új", statusChangedAt: "" },
  { id: "019", name: "Kerekes Márk Zoltán", phone: "+36 30 774 8899", address: "Szilváskút, Hunyadi utca 16.", menu: "A menü", qty: 2, createdAt: "2026.06.07 11:15", status: "Új", statusChangedAt: "" },
  { id: "020", name: "Szalai Petra", phone: "+36 20 111 2233", address: "Szilváskút, Nyárfa utca 24.", menu: "B menü", qty: 1, createdAt: "2026.06.07 11:20", status: "Új", statusChangedAt: "" },
  { id: "021", name: "Nagy István", phone: "+36 30 123 4567", address: "Szilváskút, Kossuth tér 5.", menu: "A menü", qty: 1, createdAt: "2026.06.08 08:30", status: "Új", statusChangedAt: "" },
  { id: "022", name: "Horváth Katalin", phone: "+36 70 888 9900", address: "Szilváskút, Fő utca 2.", menu: "B menü", qty: 2, createdAt: "2026.06.08 09:15", status: "Új", statusChangedAt: "" },
  { id: "023", name: "Kovács László", phone: "+36 20 555 4433", address: "Szilváskút, Akácfa utca 10.", menu: "A menü", qty: 1, createdAt: "2026.06.08 10:45", status: "Új", statusChangedAt: "" },
  { id: "024", name: "Fekete Mónika", phone: "+36 30 222 1100", address: "Szilváskút, Béke tér 1.", menu: "B menü", qty: 4, createdAt: "2026.06.08 11:05", status: "Új", statusChangedAt: "" },
  { id: "025", name: "Szabó Tamás", phone: "+36 70 333 7788", address: "Szilváskút, Sport utca 4.", menu: "A menü", qty: 2, createdAt: "2026.06.09 07:30", status: "Új", statusChangedAt: "" }
];

/**********************
 * STATUS MAPS
 **********************/

const STATUS_OPTIONS = [
  "Új",
  "Elfogadva",
  "Készül",
  "Kiszállítás alatt",
  "Kézbesítve",
  "Sikertelen kézbesítés"
];

const STATUS_BADGE_CLASS = {
  "Új":                    "status-new",
  "Elfogadva":             "status-accepted",
  "Készül":                "status-preparing",
  "Kiszállítás alatt":     "status-delivery",
  "Kézbesítve":            "status-done",
  "Sikertelen kézbesítés": "status-failed"
};

/**********************
 * STATE
 **********************/

let activeOrdersKpiFilter = null;
let editingOrderId = null;
let sortColumn = null;
let sortDir = 1; // 1 = növekvő, -1 = csökkenő
let ordersInitialRendered = false; // az első render azonnali, utána animálható

/**********************
 * HELPERS
 **********************/

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const mins = getMinutesFromOrderTime(dateStr);
  if (mins < 1)  return "most";
  if (mins < 60) return `${mins} perce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} órája`;
  return `${Math.floor(hrs / 24)} napja`;
}

/**********************
 * KPI FRISSÍTÉS
 **********************/

function updateOrdersKpis() {
  const orders = window.appData?.orders || [];

  let problem = 0, fresh = 0, preparing = 0, delivery = 0, done = 0;

  orders.forEach(o => {
    const status = (o.status || "").trim();
    if (isProblemOrder(o))                                                    problem++;
    if (status === "Új")                                                      fresh++;
    if (status === "Készül")                                                 preparing++;
    if (status === "Kiszállítás alatt")                                      delivery++;
    if (status === "Kézbesítve" || status === "Sikertelen kézbesítés")       done++;
  });

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal("kpi-orders-problem",   problem);
  setVal("kpi-orders-new",       fresh);
  setVal("kpi-orders-preparing", preparing);
  setVal("kpi-orders-delivery",  delivery);
  setVal("kpi-orders-done",      done);
}

function matchesOrdersKpiFilter(order) {
  if (!activeOrdersKpiFilter) return true;
  const status = (order.status || "").trim();
  switch (activeOrdersKpiFilter) {
    case "problem":  return isProblemOrder(order);
    case "new":      return status === "Új";
    case "preparing":return status === "Készül";
    case "delivery": return status === "Kiszállítás alatt";
    case "done":     return status === "Kézbesítve" || status === "Sikertelen kézbesítés";
    default:         return true;
  }
}

/**********************
 * RENDERELÉS
 **********************/

function renderOrders(animate) {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  closeStatusPopover();

  const kpiRow = document.querySelector("#orders-section .orders-kpi-row");

  const drawTable = () => {
    let orders = [...(window.appData?.orders || [])];

    // Rendezés
    if (sortColumn) {
      orders.sort((a, b) => {
        let va, vb;
        switch (sortColumn) {
          case "name":   va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
          case "menu":   va = a.menu.toLowerCase(); vb = b.menu.toLowerCase(); break;
          case "time":   va = a.createdAt;       vb = b.createdAt;       break;
          case "status": va = a.status;          vb = b.status;          break;
          default: return 0;
        }
        return va < vb ? -sortDir : va > vb ? sortDir : 0;
      });
    }

    tbody.innerHTML = ordersRowsHtml(orders);
    filterOrders();
  };

  // animálás csak kérésre (frissítés gomb) és csak a kezdeti render után
  if (animate && ordersInitialRendered) {
    if (kpiRow) fadeRender(kpiRow, updateOrdersKpis);
    else updateOrdersKpis();
    fadeRender(tbody, drawTable);
  } else {
    updateOrdersKpis();
    drawTable();
    ordersInitialRendered = true;
  }
}

function ordersRowsHtml(orders) {
  return orders.map(o => {
    const relTime    = relativeTime(o.createdAt);
    const badgeCls   = STATUS_BADGE_CLASS[o.status] || "";
    const lastChange = o.statusChangedAt ? `Utolsó változás: ${o.statusChangedAt}` : "Státusz még nem változott";

    return `
    <tr data-id="${o.id}">
      <td data-label="Név" class="cell-primary">${o.name}</td>
      <td data-label="Kapcsolat" class="cell-contact">
        <span class="contact-phone">${o.phone}</span>
        <span class="contact-addr">${o.address}</span>
      </td>
      <td data-label="Menü">${o.menu}<span class="qty-chip">× ${o.qty}</span></td>
      <td data-label="Rend. idő" class="order-time">
        <span class="time-rel" title="${o.createdAt}">${relTime}</span>
        <span class="time-abs">${o.createdAt}</span>
      </td>
      <td data-label="Státusz">
        <button class="status-badge ${badgeCls}"
                data-order-id="${o.id}"
                aria-label="Státusz módosítása"
                title="${lastChange}">
          ${o.status}
        </button>
      </td>
      <td data-label="Műveletek">
        <button class="action-btn edit-btn" aria-label="Rendelés szerkesztése">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="action-btn orders-delete-btn" aria-label="Rendelés törlése">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join("");
}

/**********************
 * STÁTUSZ POPOVER
 **********************/

function closeStatusPopover() {
  const el = document.getElementById("status-popover");
  if (el) el.remove();
}

function openStatusPopover(badge) {
  const orderId = badge.dataset.orderId;
  const order   = window.appData?.orders.find(o => o.id === orderId);
  if (!order) return;

  // Toggle: ha ugyanaz a rendelés, zárja be
  const existing = document.getElementById("status-popover");
  if (existing && existing.dataset.forOrder === orderId) {
    closeStatusPopover();
    return;
  }
  closeStatusPopover();

  const rect    = badge.getBoundingClientRect();
  const popover = document.createElement("div");
  popover.id              = "status-popover";
  popover.dataset.forOrder = orderId;
  popover.setAttribute("role",       "listbox");
  popover.setAttribute("aria-label", "Státusz kiválasztása");
  popover.style.top  = `${rect.bottom + 4}px`;
  popover.style.left = `${rect.left}px`;

  popover.innerHTML = STATUS_OPTIONS.map(s => {
    const cls      = STATUS_BADGE_CLASS[s] || "";
    const isCurrent = s === order.status;
    return `<button class="status-popover-option ${cls}${isCurrent ? " current" : ""}"
                    data-status="${s}"
                    data-order-id="${orderId}"
                    role="option"
                    aria-selected="${isCurrent}">${s}</button>`;
  }).join("");

  document.body.appendChild(popover);

  requestAnimationFrame(() => {
    const pr = popover.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) {
      popover.style.left = `${window.innerWidth - pr.width - 8}px`;
    }
    if (pr.bottom > window.innerHeight - 8) {
      popover.style.top  = `${rect.top - pr.height - 4}px`;
    }
  });
}

/**********************
 * BEÁLLÍTÁSOK
 **********************/

function loadStatusLimits() {
  const saved = localStorage.getItem("statusLimits");
  if (saved) {
    statusLimits = JSON.parse(saved);
  }
  document.getElementById("limit-new").value         = statusLimits["Új"];
  document.getElementById("limit-accepted").value    = statusLimits["Elfogadva"];
  document.getElementById("limit-preparing").value   = statusLimits["Készül"];
  document.getElementById("limit-delivery").value    = statusLimits["Kiszállítás alatt"];
}

function saveStatusLimits() {
  statusLimits = {
    "Új":                 Number(document.getElementById("limit-new").value),
    "Elfogadva":          Number(document.getElementById("limit-accepted").value),
    "Készül":            Number(document.getElementById("limit-preparing").value),
    "Kiszállítás alatt": Number(document.getElementById("limit-delivery").value)
  };
  localStorage.setItem("statusLimits", JSON.stringify(statusLimits));
  refreshDashboard();
  window.showToast?.("Rendelési beállítások mentve!", "success");
}

/**********************
 * SZERKESZTŐ MODAL
 **********************/

function openEditModal(orderId) {
  editingOrderId = orderId;
  const order = window.appData?.orders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById("editName").value    = order.name;
  document.getElementById("editPhone").value   = order.phone;
  document.getElementById("editAddress").value = order.address;
  document.getElementById("editMenu").value    = order.menu;
  document.getElementById("editQty").value     = order.qty;

  const modal = document.getElementById("editModal");
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("open"));
}

function saveEdit() {
  if (!editingOrderId) return;
  const order = window.appData?.orders.find(o => o.id === editingOrderId);
  if (!order) return;

  order.name    = document.getElementById("editName").value;
  order.phone   = document.getElementById("editPhone").value;
  order.address = document.getElementById("editAddress").value;
  order.menu    = document.getElementById("editMenu").value;
  order.qty     = Number(document.getElementById("editQty").value);

  closeEditModal();
  renderOrders();
  filterOrders();
  window.showToast?.("Rendelés mentve", "success");
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.remove("open");
  setTimeout(() => modal.classList.add("hidden"), 150);
  editingOrderId = null;
}

/**********************
 * TÖRLÉS MEGERŐSÍTŐ MODAL
 **********************/

let pendingDeleteId = null;

function openDeleteConfirm(orderId) {
  pendingDeleteId = orderId;
  const modal = document.getElementById("deleteConfirmModal");
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("open"));
}

function closeDeleteConfirm() {
  const modal = document.getElementById("deleteConfirmModal");
  modal.classList.remove("open");
  setTimeout(() => modal.classList.add("hidden"), 150);
  pendingDeleteId = null;
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  const idx = window.appData.orders.findIndex(o => o.id === pendingDeleteId);
  if (idx !== -1) window.appData.orders.splice(idx, 1);
  closeDeleteConfirm();
  renderOrders();
  filterOrders();
  window.refreshDashboard?.();
  window.showToast?.("Rendelés törölve", "deleted");
}

document.getElementById("deleteConfirmOk")?.addEventListener("click", confirmDelete);
document.getElementById("deleteConfirmCancel")?.addEventListener("click", closeDeleteConfirm);
document.getElementById("deleteConfirmModal")?.addEventListener("click", (e) => {
  if (e.target.id === "deleteConfirmModal") closeDeleteConfirm();
});

/**********************
 * SZŰRÉS
 **********************/

window.filterOrders = function () {
  const search = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  document.querySelectorAll("#orders-section tbody tr").forEach(row => {
    const id    = row.dataset.id;
    const order = window.appData?.orders.find(o => o.id === id);
    if (!order) { row.style.display = "none"; return; }

    const haystack = `${order.name} ${order.phone} ${order.address} ${order.menu}`.toLowerCase();
    const matchesSearch = search === "" || haystack.includes(search);
    const matchesKpi    = matchesOrdersKpiFilter(order);

    row.style.display = (matchesSearch && matchesKpi) ? "" : "none";
  });
};

/**********************
 * ESEMÉNYKEZELŐK
 **********************/

document.addEventListener("DOMContentLoaded", () => {
  renderOrders();
  // Popover zárása görgetéskor
  window.addEventListener("scroll", closeStatusPopover, { passive: true });
});

document.addEventListener("input", (e) => {
  if (e.target.id === "searchInput") filterOrders();
});

document.addEventListener("click", (e) => {

  // 1. Popover opció kattintás
  if (e.target.closest("#status-popover")) {
    const option = e.target.closest(".status-popover-option");
    if (option) {
      const orderId   = option.dataset.orderId;
      const newStatus = option.dataset.status;
      const order     = window.appData?.orders.find(o => o.id === orderId);
      if (order) {
        order.status          = newStatus;
        order.statusChangedAt = new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
        renderOrders();
        filterOrders();
        window.refreshDashboard?.();
      }
      closeStatusPopover();
    }
    return;
  }

  closeStatusPopover();

  // 2. Státusz badge megnyitás
  const badge = e.target.closest(".status-badge");
  if (badge) {
    openStatusPopover(badge);
    return;
  }

  // 3. Szerkesztés gomb
  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const row = editBtn.closest("tr");
    if (row) openEditModal(row.dataset.id);
    return;
  }

  // 4. Törlés gomb
  const deleteBtn = e.target.closest(".orders-delete-btn");
  if (deleteBtn) {
    const row = deleteBtn.closest("tr");
    const id  = row?.dataset.id;
    if (!id) return;
    openDeleteConfirm(id);
    return;
  }

  // 5. KPI chip szűrő
  const kpiBtn = e.target.closest("#orders-section .orders-kpi");
  if (kpiBtn) {
    const filter = kpiBtn.dataset.filter;
    activeOrdersKpiFilter = activeOrdersKpiFilter === filter ? null : filter;
    document.querySelectorAll("#orders-section .orders-kpi").forEach(btn => {
      const isActive = btn.dataset.filter === activeOrdersKpiFilter;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    filterOrders();
    return;
  }

  // 6. Rendezés (th kattintás)
  const sortTh = e.target.closest("#orders-section th.sortable");
  if (sortTh) {
    const col = sortTh.dataset.sort;
    if (sortColumn === col) {
      sortDir = -sortDir;
    } else {
      sortColumn = col;
      sortDir    = 1;
    }
    document.querySelectorAll("#orders-section th.sortable").forEach(th => {
      const icon = th.querySelector(".sort-icon");
      if (!icon) return;
      const isActive = th.dataset.sort === sortColumn;
      th.classList.toggle("sort-active", isActive);
      icon.textContent = isActive ? (sortDir === 1 ? "↑" : "↓") : "↕";
    });
    renderOrders();
    filterOrders();
    return;
  }
});
