/* Dashboard főoldal — mai statok, teendők, agenda, trend. */

// SLA túllépés: a státuszhoz tartozó perc-limit felett piros jelzés
function isProblemOrder(o) {
  const status = (o.status || "").trim();

  if (status === "Kézbesítve" || status === "Sikertelen kézbesítés") {
    return false;
  }

  const minutesAgo = getMinutesFromOrderTime(o.createdAt);
  const limit = window.APP_STATE?.statusLimits?.[status];

  if (limit && minutesAgo > limit) return true;

  return false;
}

// „2026.07.14 …” szöveg = mai nap
function isToday(dateText) {
  if (!dateText) return false;

  const [datePart] = dateText.split(" ");
  if (!datePart) return false;

  const [y, m, d] = datePart.split(".").map(Number);

  const today = new Date();

  return (
    y === today.getFullYear() &&
    m === today.getMonth() + 1 &&
    d === today.getDate()
  );
}


// Foglalás teendő szintje — settings.js getBookingStatus() alapján
function getBookingTodoLevel(booking) {
  const sla = typeof getBookingStatus === "function"
    ? getBookingStatus(booking)
    : { state: "ok", label: "OK" };

  if (sla.state === "problem") {
    return { level: "problem", reason: sla.label };
  }
  if (sla.state === "warning") {
    return { level: "warning", reason: sla.label };
  }
  return null;
}

const TERMINAL_ORDER_STATUSES = new Set(["Kézbesítve", "Sikertelen kézbesítés"]);

function setKpiValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getTodayIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Felső KPI: mai rendelések (leadás napja), aktív + kiszállítás (összes nyitott sor)
function updateDashboardStats() {
  const orders = window.appData?.orders || [];
  const rows = typeof expandOrdersToRows === "function"
    ? expandOrdersToRows(orders)
    : [];

  const todayOrders = orders.filter(o => isToday(o.createdAt));
  const total = todayOrders.length;

  let active = 0;
  let delivery = 0;
  let issues = 0;

  rows.forEach((row) => {
    const status = (row.rowStatus || "").trim();
    if (!status || TERMINAL_ORDER_STATUSES.has(status)) return;

    active++;
    if (status === "Kiszállítás alatt") delivery++;
  });

  todayOrders.forEach(o => {
    if (isProblemOrder(o)) issues++;
  });

  setKpiValue("stat-total-orders", total);
  setKpiValue("stat-active-orders", active);
  setKpiValue("stat-delivery-orders", delivery);

  console.log("📊 Dashboard frissítve:", {
    total,
    active,
    delivery,
    issues
  });
}
// Mai foglalások KPI — a foglalás dátuma (dateIso), nem az összes foglalás
function updateBookingDashboardStats() {
  const bookings = window.Bookings?.getBookings?.() || [];

  const todayIso = getTodayIsoDate();
  const todayBookings = bookings.filter(b => b.dateIso === todayIso);

  let total = todayBookings.length;
  let confirmed = 0;
  let guests = 0;
  let problems = 0;

  todayBookings.forEach(b => {

    if (b.status === "Visszaigazolt") {
      confirmed++;
    }

    guests += Number(b.guests || 0);

    const sla = getBookingTodoLevel(b);

    if (sla?.level === "problem") {
      problems++;
    }
  });

  setKpiValue("stat-total-bookings", total);

  console.log("📊 Booking dashboard:", { total, confirmed, guests, problems });
}

// Lista csere rövid elhalványítással (frissítés gombnál)
function fadeRender(container, draw) {
  if (!container) return;

  // első renderkor (üres konténer) nincs mit elhalványítani - ne legyen "üres pillanat"
  if (!container.firstElementChild) {
    draw();
    return;
  }

  container.classList.add("is-refreshing");
  setTimeout(() => {
    draw();
    container.classList.remove("is-refreshing");
  }, 150);
}

// Teendők blokk kirajzolása (üres állapot vagy todo-item sorok)
function renderTodoList(container, items) {
  if (!container) return;

  fadeRender(container, () => {
    container.innerHTML = "";

    if (items.length === 0) {
      container.innerHTML = "<div class='empty-state'><i class='fa-solid fa-circle-check'></i><p>Nincs elintézendő teendő</p></div>";
      return;
    }

    // SLA-probléma elöl, majd közelgő kiszállítási dátum
    items.sort((a, b) => {
      const rank = (level) => (level === "problem" ? 0 : level === "warning" ? 1 : 2);
      const diff = rank(a.level) - rank(b.level);
      if (diff !== 0) return diff;
      if (a.sortDate && b.sortDate) {
        return String(a.sortDate).localeCompare(String(b.sortDate));
      }
      return 0;
    });

    items.forEach(t => {
      const div = document.createElement("div");
      div.className = `todo-item${t.level ? ` level-${t.level}` : ""}`;
      div.innerHTML = `
        <span class="todo-name">${t.name}</span>
        <span class="todo-reason">${t.reason}</span>
      `;
      container.appendChild(div);
    });
  });
}

// Kezeletlen rendelés-napok → todo-orders-list (getUnhandledOrderRows)
function renderOrderTodos() {
  const container = document.getElementById("todo-orders-list");
  if (!container) return;

  const rows = typeof getUnhandledOrderRows === "function"
    ? getUnhandledOrderRows()
    : [];

  const todos = rows.map((row) => {
    const status = (row.rowStatus || "").trim();
    const slaProblem = typeof isProblemRow === "function" && isProblemRow(row);
    const dateLabel = typeof formatOrderDate === "function"
      ? formatOrderDate(row.deliveryDate)
      : row.deliveryDate;

    // SLA túllépés: olvasható idő + limit (pl. „Új: 1 órája (limit: 30 perc)”)
    let reason = status;
    if (slaProblem) {
      const limit = window.APP_STATE?.statusLimits?.[status];
      reason = typeof formatSlaTodoReason === "function" && limit
        ? formatSlaTodoReason(status, row.order.createdAt, limit)
        : `${status}: ${relativeTime(row.order.createdAt)}`;
    }

    return {
      level: slaProblem ? "problem" : "",
      sortDate: row.deliveryDate || "",
      name: `${row.order.name} · ${dateLabel}`,
      reason,
    };
  });

  renderTodoList(container, todos);
  return todos.length;
}

// SLA-problémás foglalások → todo-bookings-list
function renderBookingTodos() {
  const container = document.getElementById("todo-bookings-list");
  if (!container) return;

  const todos = [];
  const bookings = window.Bookings?.getBookings?.() || [];

  bookings.forEach(b => {
    const sla = getBookingTodoLevel(b);
    if (!sla) return;

    todos.push({
      level: sla.level,
      name: `${b.name} (${Number(b.guests) || 0} fő)`,
      reason: sla.reason,
    });
  });

  renderTodoList(container, todos);
  return todos.length;
}

// Sidebar számláló badge (rendelések / foglalások menüpont)
function updateSidebarNavBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.remove("hidden");
  } else {
    badge.textContent = "";
    badge.classList.add("hidden");
  }
}

// Teendők összesítése + KPI kártya + sidebar badge-ek
function renderTodos() {
  const orderCount = renderOrderTodos();
  const bookingCount = renderBookingTodos();

  const total = orderCount + bookingCount;
  const kpiEl = document.getElementById("stat-todos");
  const kpiCard = document.getElementById("kpi-todos");

  if (kpiEl) kpiEl.textContent = total;
  if (kpiCard) kpiCard.classList.toggle("has-todos", total > 0);

  updateSidebarNavBadge("sidebar-orders-badge", orderCount);
  updateSidebarNavBadge("sidebar-bookings-badge", bookingCount);
}

// Mai foglalások időrendben — agenda-list
function renderAgenda() {
  const container = document.getElementById("agenda-list");
  if (!container) return;

  const bookings = window.Bookings?.getBookings?.() || [];
  const todayIso = getTodayIsoDate();

  const todayBookings = bookings
    .filter(b => b.dateIso === todayIso)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  fadeRender(container, () => {
    container.innerHTML = "";

    if (todayBookings.length === 0) {
      container.innerHTML = "<div class='empty-state'><i class='fa-solid fa-calendar-xmark'></i><p>Nincs mai foglalás</p></div>";
      return;
    }

    todayBookings.forEach(b => {
      const div = document.createElement("div");
      div.className = "agenda-item";
      div.innerHTML = `
        <span class="agenda-time-chip">${b.time}</span>
        <span class="agenda-divider"></span>
        <span class="agenda-name">${b.name} – ${b.occasion || ""}</span>
        <span class="agenda-guests">${b.guests || 0} fő</span>
      `;
      container.appendChild(div);
    });
  });
}

// Heti oszlopdiagram — rendelések létrehozási napja szerint
function renderTrendChart() {
  const container = document.getElementById("trend-chart");
  if (!container) return;

  const orders = window.appData?.orders || [];
  const dayCounts = {};

  orders.forEach(o => {
    const [datePart] = (o.createdAt || "").split(" ");
    if (!datePart) return;
    dayCounts[datePart] = (dayCounts[datePart] || 0) + 1;
  });

  // a jelenlegi hét (hétfőtől vasárnapig), beleértve a jövőbeli napokat is
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7; // hétfő = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    days.push({ key, date: d });
  }

  const max = Math.max(...days.map(d => dayCounts[d.key] || 0), 1);

  const dayNames = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

  container.innerHTML = `<div class="trend-chart">${days.map(({ key, date }) => {
    const weekday = dayNames[date.getDay()];
    const count = dayCounts[key] || 0;
    const heightPct = count === 0 ? 0 : Math.round((count / max) * 100);
    const isToday = date.getTime() === today.getTime();
    const classes = [count === 0 && "empty", isToday && "today"].filter(Boolean).join(" ");
    const dateLabel = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,"0")}.${String(date.getDate()).padStart(2,"0")}`;
    const tooltipText = `${dateLabel}: ${count} rendelés`;

    return `
      <div class="trend-bar-wrap${classes ? " " + classes : ""}" title="${tooltipText}" aria-label="${tooltipText}" role="img">
        <span class="trend-bar-value" aria-hidden="true">${count}</span>
        <div class="trend-bar" style="height: ${heightPct}%"></div>
        <span class="trend-bar-label" aria-hidden="true">${weekday}</span>
      </div>
    `;
  }).join("")}</div>
  <p class="visually-hidden" aria-label="Heti rendelés trend összefoglaló">
    ${days.map(({key, date}) => {
      const count = dayCounts[key] || 0;
      return `${date.toLocaleDateString("hu-HU", {weekday:"long"})}: ${count} rendelés`;
    }).join(", ")}
  </p>`;
}

// Top 5 menü tétel összesített mennyiség alapján
function renderTopItems() {
  const container = document.getElementById("top-items-list");
  if (!container) return;

  const orders = window.appData?.orders || [];
  const counts = {};

  orders.forEach(o => {
    (o.items || []).forEach((item) => {
      const key = `${item.day} ${item.menu}`;
      counts[key] = (counts[key] || 0) + (item.qty || 1);
    });
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = "<div class='empty-state'><i class='fa-solid fa-chart-pie'></i><p>Még nincs adat</p></div>";
    return;
  }

  const totalServed = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const max = sorted[0][1];

  const rows = sorted.map(([name, count]) => {
    const pct = Math.round((count / max) * 100);
    return `
      <div class="top-item-row">
        <div class="top-item-info">
          <span class="top-item-name">${name}</span>
          <span class="top-item-count">${count} db</span>
        </div>
        <div class="top-item-bar"><div class="top-item-bar-fill" style="width: ${pct}%"></div></div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="top-items-rows">${rows}</div>
    <div class="top-items-total">
      <span>Összes kiszolgált adag</span>
      <strong>${totalServed} db</strong>
    </div>
  `;
}

// Utolsó 3 üzenet + olvasatlan szám (KPI + sidebar badge)
function renderMessagesPreview() {
  const container = document.getElementById("messages-preview-list");

  const all = window.appData?.messages || [];
  const unreadCount = all.filter(m => !m.read && !m.archived).length;

  const kpiEl = document.getElementById("stat-messages");
  if (kpiEl) kpiEl.textContent = unreadCount;

  const badge = document.getElementById("sidebar-msg-badge");
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  if (!container) return;

  const data = all
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  if (data.length === 0) {
    container.innerHTML = "<div class='empty-state'><i class='fa-solid fa-inbox'></i><p>Nincs üzenet</p></div>";
    return;
  }

  container.innerHTML = data.map(m => `
    <div class="message-preview-row">
      <span class="msg-sender">${escapeHtml(m.name)}</span>
      <span class="msg-subject">${escapeHtml(m.subject)}</span>
    </div>
  `).join("");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Időfüggő kijelzések frissítése API nélkül („X perce”, SLA piros/sárga sorok, teendők)
function refreshLiveTimeDisplays() {
  if (document.hidden) return;

  renderTodos();

  if (document.getElementById("orders-section")?.classList.contains("active")) {
    if (typeof renderOrders === "function") renderOrders(false);
  }

  if (document.getElementById("bookings-section")?.classList.contains("active")) {
    if (typeof Bookings !== "undefined") Bookings.renderBookings(false);
  }
}

function startLiveTimeTicker() {
  const TICK_MS = 60_000;

  refreshLiveTimeDisplays();
  setInterval(refreshLiveTimeDisplays, TICK_MS);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshLiveTimeDisplays();
  });
}

window.refreshLiveTimeDisplays = refreshLiveTimeDisplays;
window.startLiveTimeTicker = startLiveTimeTicker;

// Főoldal teljes újrarajz — live-sync és frissítés gomb is ezt hívja
window.refreshDashboard = function () {
  updateDashboardStats();
  updateBookingDashboardStats();
  renderTodos();
  renderAgenda();
  renderTrendChart();
  renderTopItems();
  renderMessagesPreview();

  const topbarUpdated = document.getElementById("topbarUpdated");
  if (topbarUpdated) {
    const now = new Date();
    const time = now.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    topbarUpdated.classList.add("flash");
    requestAnimationFrame(() => {
      topbarUpdated.textContent = `Frissítve: ${time}`;
      topbarUpdated.classList.remove("flash");
    });
  }
}

