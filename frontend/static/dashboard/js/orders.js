/**********************
 * RENDELÉSEK — dashboard táblázat
 *
 * Adatmodell (két szint):
 *   Order (rendelés)     → window.appData.orders[] egy elem
 *   OrderRow (táblázat)  → expandOrdersToRows() egy sora
 *
 * OrderRow mezők:
 *   order         — a teljes rendelés (név, telefon, cím, items[])
 *   deliveryDate  — a sor kiszállítási napja (ISO dátum)
 *   items         — az adott nap OrderItem tételei
 *   itemIds       — ezeknek a tételeknek az adatbázis id-i (PATCH/DELETE body)
 *   rowStatus     — a sor státusz badge felirata (magyar)
 *
 * Egy rendelés több napra szólhat → több sor, név/kapcsolat ismétlődik.
 * Sor azonosító a DOM-ban: data-id (Order) + data-item-ids (OrderItem lista).
 * Státusz az adatbázisban: OrderItem.status — PATCH item_ids listával.
 **********************/

/**********************
 * API — státusz leképezés (DB → dashboard)
 **********************/

const STATUS_FROM_API = {
  new: "Új",
  confirmed: "Elfogadva",
  preparing: "Készül",
  ready: "Kiszállítás alatt",
  delivered: "Kézbesítve",
  cancelled: "Sikertelen kézbesítés",
};

// Dashboard felirat → DB kulcs (PATCH body)
const STATUS_TO_API = {
  "Új": "new",
  "Elfogadva": "confirmed",
  "Készül": "preparing",
  "Kiszállítás alatt": "ready",
  "Kézbesítve": "delivered",
  "Sikertelen kézbesítés": "cancelled",
};

function itemStatusLabel(apiStatus) {
  return STATUS_FROM_API[apiStatus] || apiStatus || "Új";
}

const MONTH_LABELS = [
  "jan.", "feb.", "már.", "ápr.", "máj.", "jún.",
  "júl.", "aug.", "szept.", "okt.", "nov.", "dec.",
];

function formatHuDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatHuDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${year}. ${MONTH_LABELS[month - 1]} ${day}.`;
}

function mapApiOrderToDashboard(apiOrder) {
  const items = (apiOrder.items || []).map((item) => ({
    id: item.id,
    day: item.day,
    menu: item.menu,
    menu_type: item.menu_type,
    qty: item.quantity,
    delivery_date: item.delivery_date,
    status: itemStatusLabel(item.status),
  }));

  return {
    id: String(apiOrder.id),
    name: apiOrder.customer_name || "",
    phone: apiOrder.customer_phone || "",
    address: apiOrder.delivery_address || "",
    items,
    createdAt: formatHuDateTime(apiOrder.created_at),
  };
}

async function loadOrdersFromApi() {
  const response = await fetch("/api/orders/", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Orders API hiba: ${response.status}`);
  }

  const data = await response.json();
  window.appData = window.appData || {};
  window.appData.orders = data.map(mapApiOrderToDashboard);

  console.log("Rendelések betöltve API-ból:", window.appData.orders);
  return window.appData.orders;
}

window.loadOrdersFromApi = loadOrdersFromApi;

// Django session + CSRF — PATCH/POST kérésekhez (mint login.js authRequest)
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return null;
}

async function ordersApiRequest(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const csrfToken = getCookie("csrftoken");
  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }
  return fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
}

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
let editingItemIds = null;
let editingDeliveryDate = null;
let editingLineQty = { A: 0, B: 0 };
let sortColumn = null;
let sortDir = 1; // 1 = növekvő, -1 = csökkenő
let ordersInitialRendered = false; // az első render azonnali, utána animálható

/**********************
 * HELPERS
 **********************/

function getOrderItemsText(orderOrItems) {
  const items = Array.isArray(orderOrItems)
    ? orderOrItems
    : orderOrItems?.items || [];

  return items
    .map((item) => `${item.day} ${item.menu} × ${item.qty}`)
    .join(" ");
}

function groupItemsByDeliveryDate(items = []) {
  // Ugyanarra a napra eső tételek egy csoportba (egy táblázat-sor)
  const groups = new Map();

  items.forEach((item) => {
    const key = item.delivery_date || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function getRowStatusFromItems(items) {
  // Egy táblázat-sor = egy kiszállítási nap tételei; státuszváltáskor mind egyszerre frissül.
  // Ha mégis eltérő lenne, jelezzük — ne mutassunk félrevezetően csak az elsőt.
  if (!items?.length) return "Új";
  const statuses = items.map((item) => item.status || "Új");
  const first = statuses[0];
  return statuses.every((s) => s === first) ? first : "Eltérő";
}

function parseItemIds(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/**********************
 * HELYI ÁLLAPOT SZINKRON (sikeres API után)
 *
 * A státuszváltás, szerkesztés és törlés különböző végpontot hív,
 * de mindegyik után ugyanaz kell: appData + táblázat + szűrő (+ opcionálisan dashboard).
 **********************/

/**
 * Backend Order JSON → appData frissítés + újrarenderelés.
 * Használat: PATCH státusz, PATCH kapcsolat, részleges DELETE után (maradt tétel).
 */
function applyOrderUpdate(apiOrder, { refreshDashboard = false } = {}) {
  window.appData = window.appData || {};
  window.appData.orders = window.appData.orders || [];

  const orderId = String(apiOrder.id);
  const mapped = mapApiOrderToDashboard(apiOrder);
  const index = window.appData.orders.findIndex((o) => o.id === orderId);

  if (index !== -1) {
    window.appData.orders[index] = mapped;
  } else {
    window.appData.orders.push(mapped);
  }

  renderOrders();
  filterOrders();

  if (refreshDashboard) {
    window.refreshDashboard?.();
  }
}

/**
 * Teljes rendelés eltávolítása a memóriából.
 * Használat: DELETE után, ha a backend 204-et ad (nem maradt OrderItem).
 */
function removeOrder(orderId, { refreshDashboard = false } = {}) {
  const id = String(orderId);
  const index = window.appData.orders.findIndex((o) => o.id === id);

  if (index !== -1) {
    window.appData.orders.splice(index, 1);
  }

  renderOrders();
  filterOrders();

  if (refreshDashboard) {
    window.refreshDashboard?.();
  }
}

// PATCH /api/orders/<id>/items/status/ — OrderItem.status frissül az adatbázisban
async function setRowStatus(order, itemIds, statusLabel) {
  const apiStatus = STATUS_TO_API[statusLabel];
  if (!apiStatus || !itemIds?.length) return;

  try {
    const response = await ordersApiRequest(`/api/orders/${order.id}/items/status/`, {
      method: "PATCH",
      body: JSON.stringify({
        item_ids: itemIds,
        status: apiStatus,
      }),
    });

    if (!response.ok) {
      const message = await readApiErrorMessage(response, "Státusz frissítés sikertelen");
      window.showToast?.(message, "error");
      return;
    }

    const updatedOrder = await response.json();
    applyOrderUpdate(updatedOrder, { refreshDashboard: true });
  } catch (err) {
    console.error("Státusz frissítés sikertelen:", err);
    window.showToast?.("Státusz frissítés sikertelen", "error");
  }
}

function expandOrdersToRows(orders) {
  // 1 Order → N OrderRow; minden sor egy delivery_date csoport (groupItemsByDeliveryDate).
  const rows = [];

  orders.forEach((order, groupIndex) => {
    const groups = groupItemsByDeliveryDate(order.items);
    const groupCount = groups.length;

    groups.forEach(([deliveryDate, items], index) => {
      const itemIds = items.map((item) => item.id);
      rows.push({
        order,
        deliveryDate,
        items,
        itemIds,
        groupIndex,
        isFirst: index === 0,
        isLast: index === groupCount - 1,
        isOnly: groupCount === 1,
        rowStatus: getRowStatusFromItems(items),
      });
    });
  });

  return rows;
}

function isProblemRow(row) {
  return isProblemOrder({
    status: row.rowStatus,
    createdAt: row.order.createdAt,
  });
}

function formatOrderItemsHtml(items = []) {
  return items
    .map(
      (item) => `
        <div class="order-line">
          <span class="order-line-day">${item.day}</span>
          <span class="order-line-menu">${item.menu}</span>
          <span class="qty-chip">× ${item.qty}</span>
        </div>`,
    )
    .join("");
}

function formatSingleDeliveryHtml(deliveryDate) {
  return `
    <div class="delivery-line">
      <i class="fa-regular fa-calendar"></i>
      ${formatHuDate(deliveryDate)}
    </div>`;
}

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
  // KPI-k nap-sorok alapján számolódnak, nem rendelés-szinten
  const rows = expandOrdersToRows(window.appData?.orders || []);

  let problem = 0, fresh = 0, preparing = 0, delivery = 0, done = 0;

  rows.forEach((row) => {
    const status = (row.rowStatus || "").trim();
    if (isProblemRow(row)) problem++;
    if (status === "Új") fresh++;
    if (status === "Készül") preparing++;
    if (status === "Kiszállítás alatt") delivery++;
    if (status === "Kézbesítve" || status === "Sikertelen kézbesítés") done++;
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

function matchesOrdersKpiFilter(row) {
  if (!activeOrdersKpiFilter) return true;
  const status = (row.rowStatus || "").trim();
  switch (activeOrdersKpiFilter) {
    case "problem":  return isProblemRow(row);
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
    let rows = expandOrdersToRows(orders);

    if (sortColumn) {
      rows.sort((a, b) => {
        let va, vb;
        switch (sortColumn) {
          case "name":
            va = a.order.name.toLowerCase();
            vb = b.order.name.toLowerCase();
            break;
          case "menu":
            va = getOrderItemsText(a.items).toLowerCase();
            vb = getOrderItemsText(b.items).toLowerCase();
            break;
          case "delivery":
            va = a.deliveryDate;
            vb = b.deliveryDate;
            break;
          case "time":
            va = a.order.createdAt;
            vb = b.order.createdAt;
            break;
          case "status":
            va = a.rowStatus;
            vb = b.rowStatus;
            break;
          default:
            return 0;
        }

        if (va < vb) return -sortDir;
        if (va > vb) return sortDir;

        if (a.order.id !== b.order.id) return a.order.id.localeCompare(b.order.id);
        return a.deliveryDate.localeCompare(b.deliveryDate);
      });
    }

    tbody.innerHTML = ordersRowsHtml(rows);
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

function ordersRowsHtml(rows) {
  return rows.map((row) => {
    const o = row.order;
    const relTime = relativeTime(o.createdAt);
    const badgeCls = STATUS_BADGE_CLASS[row.rowStatus] || "";
    const itemIdsAttr = row.itemIds.join(",");

    // Vizuális csoportosítás: ugyanahhoz a rendeléshez tartozó nap-sorok
    const groupPosClass = row.isOnly
      ? "order-group-only"
      : row.isFirst
        ? "order-group-first"
        : row.isLast
          ? "order-group-last"
          : "order-group-middle";
    const groupToneClass = row.groupIndex % 2 === 0 ? "order-group-even" : "order-group-odd";
    const problemClass = isProblemRow(row) ? "row-problem" : "";

    return `
    <tr
      data-id="${o.id}"
      data-item-ids="${itemIdsAttr}"
      data-delivery-date="${row.deliveryDate}"
      class="order-group-row ${groupPosClass} ${groupToneClass} ${problemClass}"
    >
      <td data-label="Név" class="cell-primary">
        <div class="cell-vcenter">${o.name}</div>
      </td>
      <td data-label="Kapcsolat" class="cell-contact">
        <div class="cell-vcenter cell-contact-inner">
          <span class="contact-phone">${o.phone}</span>
          <span class="contact-addr">${o.address}</span>
        </div>
      </td>
      <td data-label="Rendelés" class="cell-order-items">
        <div class="cell-vcenter">
          <div class="order-lines">${formatOrderItemsHtml(row.items)}</div>
        </div>
      </td>
      <td data-label="Kiszállítás" class="cell-delivery-dates">
        <div class="cell-vcenter">
          ${formatSingleDeliveryHtml(row.deliveryDate)}
        </div>
      </td>
      <td data-label="Rend. idő" class="order-time">
        <div class="cell-vcenter order-time-inner">
          <span class="time-rel" title="${o.createdAt}">${relTime}</span>
          <span class="time-abs">${o.createdAt}</span>
        </div>
      </td>
      <td data-label="Státusz" class="cell-status">
        <div class="cell-vcenter">
          <button class="status-badge ${badgeCls}"
                  data-order-id="${o.id}"
                  data-item-ids="${itemIdsAttr}"
                  aria-label="Státusz módosítása">
            ${row.rowStatus}
          </button>
        </div>
      </td>
      <td data-label="Műveletek" class="cell-actions-wrap">
        <div class="cell-vcenter cell-actions">
          <button class="action-btn edit-btn" aria-label="Rendelés szerkesztése">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="action-btn orders-delete-btn" aria-label="Rendelés törlése">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
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
  const itemIds = parseItemIds(badge.dataset.itemIds);
  const order = window.appData?.orders.find(o => o.id === orderId);
  if (!order || !itemIds.length) return;

  const rowKey = `${orderId}:${itemIds.join("-")}`;

  const existing = document.getElementById("status-popover");
  if (existing && existing.dataset.forRow === rowKey) {
    closeStatusPopover();
    return;
  }
  closeStatusPopover();

  const rowItems = order.items.filter((item) => itemIds.includes(item.id));
  const currentStatus = getRowStatusFromItems(rowItems);
  const rect = badge.getBoundingClientRect();
  const popover = document.createElement("div");
  popover.id = "status-popover";
  popover.dataset.forRow = rowKey;
  popover.setAttribute("role", "listbox");
  popover.setAttribute("aria-label", "Státusz kiválasztása");
  popover.style.top = `${rect.bottom + 4}px`;
  popover.style.left = `${rect.left}px`;

  popover.innerHTML = STATUS_OPTIONS.map(s => {
    const cls = STATUS_BADGE_CLASS[s] || "";
    const isCurrent = s === currentStatus;
    return `<button class="status-popover-option ${cls}${isCurrent ? " current" : ""}"
                    data-status="${s}"
                    data-order-id="${orderId}"
                    data-item-ids="${itemIds.join(",")}"
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
  const defaults = window.APP_STATE?.statusLimits || {
    "Új": 30,
    "Elfogadva": 45,
    "Készül": 60,
    "Kiszállítás alatt": 90,
  };

  let limits = { ...defaults };
  const saved = localStorage.getItem("statusLimits");
  if (saved) {
    try {
      limits = { ...limits, ...JSON.parse(saved) };
    } catch (_) {
      /* érvénytelen localStorage → alapértelmezés marad */
    }
  }

  window.APP_STATE = window.APP_STATE || {};
  window.APP_STATE.statusLimits = limits;

  const setLimit = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.value = limits[key];
  };

  setLimit("limit-new", "Új");
  setLimit("limit-accepted", "Elfogadva");
  setLimit("limit-preparing", "Készül");
  setLimit("limit-delivery", "Kiszállítás alatt");
}

function saveStatusLimits() {
  const limits = {
    "Új":                 Number(document.getElementById("limit-new").value),
    "Elfogadva":          Number(document.getElementById("limit-accepted").value),
    "Készül":            Number(document.getElementById("limit-preparing").value),
    "Kiszállítás alatt": Number(document.getElementById("limit-delivery").value),
  };

  window.APP_STATE = window.APP_STATE || {};
  window.APP_STATE.statusLimits = limits;
  localStorage.setItem("statusLimits", JSON.stringify(limits));
  refreshDashboard();
  window.showToast?.("Rendelési beállítások mentve!", "success");
}

/**********************
 * SZERKESZTŐ MODAL
 **********************/

function renderEditMenuQtyStepper(menuType, qty) {
  return `
    <div class="order-edit-stepper" data-menu-type="${menuType}">
      <button type="button" class="order-edit-step-btn" data-action="dec" aria-label="Kevesebb">−</button>
      <span class="order-edit-qty" id="editQty${menuType}">${qty}</span>
      <button type="button" class="order-edit-step-btn" data-action="inc" aria-label="Több">+</button>
    </div>`;
}

function renderEditOrderLines(deliveryDate, rowItems) {
  const label = document.getElementById("editDeliveryDateLabel");
  const container = document.getElementById("editOrderLines");
  if (!container) return;

  editingLineQty = {
    A: rowItems.find((item) => item.menu_type === "A")?.qty ?? 0,
    B: rowItems.find((item) => item.menu_type === "B")?.qty ?? 0,
  };

  if (label) {
    label.textContent = formatHuDate(deliveryDate);
  }

  container.innerHTML = `
    <div class="order-edit-line">
      <span class="order-edit-line-label">A menü</span>
      ${renderEditMenuQtyStepper("A", editingLineQty.A)}
    </div>
    <div class="order-edit-line">
      <span class="order-edit-line-label">B menü</span>
      ${renderEditMenuQtyStepper("B", editingLineQty.B)}
    </div>`;
}

function changeEditMenuQty(menuType, delta) {
  if (!editingLineQty) return;
  editingLineQty[menuType] = Math.max(0, Math.min(20, editingLineQty[menuType] + delta));
  const qtyEl = document.getElementById(`editQty${menuType}`);
  if (qtyEl) qtyEl.textContent = editingLineQty[menuType];
}

function openEditModal(orderId, itemIds) {
  // PATCH /api/orders/<id>/ — kapcsolat + az adott nap A/B menü darabszáma (nap fix).
  editingOrderId = orderId;
  editingItemIds = itemIds;
  const order = window.appData?.orders.find(o => o.id === orderId);
  if (!order) return;

  const rowItems = order.items.filter((item) => itemIds.includes(item.id));
  editingDeliveryDate = rowItems[0]?.delivery_date ?? null;

  document.getElementById("editName").value = order.name;
  document.getElementById("editPhone").value = order.phone;
  document.getElementById("editAddress").value = order.address;

  if (editingDeliveryDate) {
    renderEditOrderLines(editingDeliveryDate, rowItems);
  }

  const modal = document.getElementById("editModal");
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("open"));
}

async function saveEdit() {
  if (!editingOrderId) return;

  if (!editingDeliveryDate) {
    window.showToast?.("Hiányzik a kiszállítási nap.", "error");
    return;
  }

  if (editingLineQty.A + editingLineQty.B < 1) {
    window.showToast?.("Legalább egy menüből rendeljen legalább 1 darabot.", "error");
    return;
  }

  const payload = {
    customer_name: document.getElementById("editName").value.trim(),
    customer_phone: document.getElementById("editPhone").value.trim(),
    delivery_address: document.getElementById("editAddress").value.trim(),
    delivery_date: editingDeliveryDate,
    item_lines: [
      { menu_type: "A", quantity: editingLineQty.A },
      { menu_type: "B", quantity: editingLineQty.B },
    ],
  };

  try {
    const response = await ordersApiRequest(`/api/orders/${editingOrderId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await readApiErrorMessage(response, "Hiba mentés közben");
      window.showToast?.(message, "error");
      return;
    }

    const updatedOrder = await response.json();

    closeEditModal();
    applyOrderUpdate(updatedOrder, { refreshDashboard: true });
    window.showToast?.("Rendelés mentve", "success");
  } catch (err) {
    console.error("Rendelés mentés sikertelen:", err);
    window.showToast?.("Hiba mentés közben", "error");
  }
}

window.saveEdit = saveEdit;

function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.remove("open");
  setTimeout(() => modal.classList.add("hidden"), 150);
  editingOrderId = null;
  editingItemIds = null;
  editingDeliveryDate = null;
  editingLineQty = { A: 0, B: 0 };
}

window.closeEditModal = closeEditModal;

/**********************
 * TÖRLÉS MEGERŐSÍTŐ MODAL
 **********************/

let pendingDeleteId = null;
let pendingDeleteItemIds = null;

function openDeleteConfirm(orderId, itemIds) {
  pendingDeleteId = orderId;
  pendingDeleteItemIds = itemIds;
  const modal = document.getElementById("deleteConfirmModal");
  modal.classList.remove("hidden");
  requestAnimationFrame(() => modal.classList.add("open"));
}

function closeDeleteConfirm() {
  const modal = document.getElementById("deleteConfirmModal");
  modal.classList.remove("open");
  setTimeout(() => modal.classList.add("hidden"), 150);
  pendingDeleteId = null;
  pendingDeleteItemIds = null;
}

async function confirmDelete() {
  if (!pendingDeleteId || !pendingDeleteItemIds?.length) return;

  const orderId = pendingDeleteId;

  try {
    // DELETE /api/orders/<id>/items/delete/ — OrderItem törlés; üres Order → 204
    const response = await ordersApiRequest(
      `/api/orders/${orderId}/items/delete/`,
      {
        method: "DELETE",
        body: JSON.stringify({
          item_ids: pendingDeleteItemIds,
        }),
      }
    );

    if (!response.ok && response.status !== 204) {
      const message = await readApiErrorMessage(response, "Törlés sikertelen");
      window.showToast?.(message, "error");
      return;
    }

    closeDeleteConfirm();

    if (response.status === 204) {
      removeOrder(orderId, { refreshDashboard: true });
    } else {
      const updatedOrder = await response.json();
      applyOrderUpdate(updatedOrder, { refreshDashboard: true });
    }

    window.showToast?.("Rendelés törölve", "deleted");
  } catch (err) {
    console.error("Törlés sikertelen:", err);
    window.showToast?.("Törlés sikertelen", "error");
  }
}

document.getElementById("deleteConfirmOk")?.addEventListener("click", confirmDelete);
document.getElementById("deleteConfirmCancel")?.addEventListener("click", closeDeleteConfirm);
document.getElementById("deleteConfirmModal")?.addEventListener("click", (e) => {
  if (e.target.id === "deleteConfirmModal") closeDeleteConfirm();
});

// Szerkesztő modal: A/B menü darabszám stepper
document.getElementById("editModal")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".order-edit-step-btn");
  if (!btn) return;
  const stepper = btn.closest(".order-edit-stepper");
  if (!stepper) return;
  const menuType = stepper.dataset.menuType;
  const delta = btn.dataset.action === "inc" ? 1 : -1;
  changeEditMenuQty(menuType, delta);
});

/**********************
 * SZŰRÉS
 **********************/

window.filterOrders = function () {
  // Keresés és KPI-szűrő soronként (data-item-ids alapján)
  const search = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();

  document.querySelectorAll("#orders-section tbody tr").forEach(row => {
    const id = row.dataset.id;
    const itemIds = parseItemIds(row.dataset.itemIds);
    const deliveryDate = row.dataset.deliveryDate;
    const order = window.appData?.orders.find(o => o.id === id);

    if (!order || !itemIds.length) {
      row.style.display = "none";
      return;
    }

    const items = order.items.filter((item) => itemIds.includes(item.id));
    const rowData = {
      order,
      deliveryDate,
      items,
      itemIds,
      rowStatus: getRowStatusFromItems(items),
    };

    const haystack = `${order.name} ${order.phone} ${order.address} ${getOrderItemsText(items)} ${deliveryDate} ${formatHuDate(deliveryDate)}`.toLowerCase();
    const matchesSearch = search === "" || haystack.includes(search);
    const matchesKpi = matchesOrdersKpiFilter(rowData);

    row.style.display = (matchesSearch && matchesKpi) ? "" : "none";
  });
};

/**********************
 * ESEMÉNYKEZELŐK
 **********************/

document.addEventListener("input", (e) => {
  if (e.target.id === "searchInput") filterOrders();
});

window.addEventListener("scroll", closeStatusPopover, { passive: true });

document.addEventListener("click", (e) => {

  // 1. Popover opció kattintás
  if (e.target.closest("#status-popover")) {
    const option = e.target.closest(".status-popover-option");
    if (option) {
      const orderId = option.dataset.orderId;
      const itemIds = parseItemIds(option.dataset.itemIds);
      const newStatus = option.dataset.status;
      const order = window.appData?.orders.find(o => o.id === orderId);
      if (order) {
        setRowStatus(order, itemIds, newStatus);
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
    if (row) openEditModal(row.dataset.id, parseItemIds(row.dataset.itemIds));
    return;
  }

  const deleteBtn = e.target.closest(".orders-delete-btn");
  if (deleteBtn) {
    const row = deleteBtn.closest("tr");
    const id = row?.dataset.id;
    const itemIds = parseItemIds(row?.dataset.itemIds);
    if (!id || !itemIds.length) return;
    openDeleteConfirm(id, itemIds);
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
