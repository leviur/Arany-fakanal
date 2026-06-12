// ======================================================
// ORDERS HELPERS
// ======================================================
function isProblemOrder(o) {
  const status = (o.status || "").trim();
  const minutesAgo = getMinutesFromOrderTime(o.createdAt);
  const limit = window.APP_STATE?.statusLimits?.[status];

  if (status === "Sikertelen kézbesítés") return true;
  if (limit && minutesAgo > limit) return true;

  return false;
}

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


function getMinutesFromOrderTime(timeText) {
  if (!timeText) return 0;

  const [datePart, timePart] = timeText.split(" ");
  if (!datePart || !timePart) return 0;

  const [y, m, d] = datePart.split(".").map(Number);
  const [h, min] = timePart.split(":").map(Number);

  const orderDate = new Date(y, m - 1, d, h, min, 0);

  return Math.floor((Date.now() - orderDate.getTime()) / 60000);
}

// ======================================================
// BOOKING SLA ENGINE (TE SZABÁLYOD)
// ======================================================
function parseDate(str) {
  if (!str) return null;
  const [d, t] = str.split(" ");
  if (!d || !t) return null;

  const [y, m, day] = d.split(".").map(Number);
  const [hh, mm] = t.split(":").map(Number);

  return new Date(y, m - 1, day, hh, mm, 0);
}

function getBookingSLA(b) {

  const created = parseDate(b.createdAt);
  if (!created) {
    return { level: "problem", reason: "Nincs dátum" };
  }

  const minutes = (Date.now() - created.getTime()) / 60000;

  // 🔴 Lemondva
  if (b.status === "Lemondva") {
    return { level: "problem", reason: "Lemondva" };
  }

  // 🆕 ÚJ
  if (b.status === "Új") {

    if (minutes >= 180) {
      return { level: "problem", reason: "Új > 180 perc" };
    }

    if (minutes >= 60) {
      return { level: "warning", reason: "Új > 60 perc" };
    }

    return { level: "ok", reason: "Új - friss" };
  }

  // ✅ VISSZAIGAZOLT
  if (b.status === "Visszaigazolt") {

    const hours = minutes / 60;

    if (hours >= 24) {
      return { level: "warning", reason: "Visszaigazolt > 24 óra" };
    }

    return { level: "ok", reason: "OK" };
  }

  return { level: "ok", reason: "OK" };
}

// ======================================================
// ORDERS DASHBOARD
// ======================================================
function updateDashboardStats() {
  const orders = window.appData?.orders || [];

  //  CSAK MAI RENDELÉSEK
  const todayOrders = orders.filter(o => isToday(o.createdAt));

  let total = todayOrders.length;
  let active = 0;
  let delivery = 0;
  let issues = 0;

  todayOrders.forEach(o => {
    const status = (o.status || "").trim();
    const minutesAgo = getMinutesFromOrderTime(o.createdAt);

    if (!status) return;

    // aktív rendelések
    if (status !== "Kézbesítve" && status !== "Sikertelen kézbesítés") {
      active++;
    }

    // kiszállítás alatt
    if (status === "Kiszállítás alatt") {
      delivery++;
    }

    if (isProblemOrder(o)) {
      issues++;
    }
  });

  //  UI frissítés
  document.getElementById("stat-total-orders").textContent = total;
  document.getElementById("stat-active-orders").textContent = active;
  document.getElementById("stat-delivery-orders").textContent = delivery;

  console.log("📊 Dashboard frissítve:", {
    total,
    active,
    delivery,
    issues
  });
}
// ======================================================
// BOOKINGS DASHBOARD
// ======================================================
function updateBookingDashboardStats() {
  const bookings = Bookings.getBookings?.() || [];

  let total = bookings.length;
  let confirmed = 0;
  let guests = 0;
  let problems = 0;

  bookings.forEach(b => {

    if (b.status === "Visszaigazolt") {
      confirmed++;
    }

    guests += Number(b.guests || 0);

    const sla = getBookingSLA(b);

    if (sla?.level === "problem") {
      problems++;
    }
  });

  document.getElementById("stat-total-bookings").textContent = total;

  console.log("📊 Booking dashboard:", { total, confirmed, guests, problems });
}

// ======================================================
// SEGÉDFÜGGVÉNY: lista-tartalom csere finom crossfade-del
// ======================================================
function fadeRender(container, draw) {
  if (!container) return;

  container.classList.add("is-refreshing");
  setTimeout(() => {
    draw();
    container.classList.remove("is-refreshing");
  }, 150);
}

// ======================================================
// TEENDŐK (kezeletlen rendelések + foglalások)
// ======================================================
function renderTodoList(container, items) {
  if (!container) return;

  fadeRender(container, () => {
    container.innerHTML = "";

    if (items.length === 0) {
      container.innerHTML = "<div class='empty-state'><i class='fa-solid fa-circle-check'></i><p>Nincs elintézendő teendő</p></div>";
      return;
    }

    // lejárt teendők előre
    items.sort((a, b) => (a.level === "problem" ? -1 : 1) - (b.level === "problem" ? -1 : 1));

    items.forEach(t => {
      const div = document.createElement("div");
      div.className = `todo-item level-${t.level}`;
      div.innerHTML = `
        <span class="todo-name">${t.name}</span>
        <span class="todo-reason">${t.reason}</span>
      `;
      container.appendChild(div);
    });
  });
}

function renderOrderTodos() {
  const container = document.getElementById("todo-orders-list");
  if (!container) return;

  const todos = [];
  const orders = window.appData?.orders || [];

  orders.filter(o => isToday(o.createdAt)).forEach(o => {
    if (!isProblemOrder(o)) return;

    const status = (o.status || "").trim();
    const minutesAgo = getMinutesFromOrderTime(o.createdAt);
    const level = status === "Sikertelen kézbesítés" ? "problem" : "warning";

    todos.push({
      level,
      name: `#${o.id} – ${o.name}`,
      reason: status === "Sikertelen kézbesítés"
        ? "Sikertelen kézbesítés"
        : `${status}: ${minutesAgo} perce`
    });
  });

  renderTodoList(container, todos);
  return todos.length;
}

function renderBookingTodos() {
  const container = document.getElementById("todo-bookings-list");
  if (!container) return;

  const todos = [];
  const bookings = Bookings.getBookings?.() || [];

  bookings.forEach(b => {
    const sla = getBookingSLA(b);
    if (sla.level === "ok") return;

    todos.push({
      level: sla.level,
      name: `${b.name} (${b.guests || 0} fő)`,
      reason: sla.reason
    });
  });

  renderTodoList(container, todos);
  return todos.length;
}

function renderTodos() {
  const orderCount = renderOrderTodos();
  const bookingCount = renderBookingTodos();

  const total = orderCount + bookingCount;
  const kpiEl = document.getElementById("stat-todos");
  const kpiCard = document.getElementById("kpi-todos");

  if (kpiEl) kpiEl.textContent = total;
  if (kpiCard) kpiCard.classList.toggle("has-todos", total > 0);
}

// ======================================================
// MAI FOGLALÁSOK - AGENDA
// ======================================================
function renderAgenda() {
  const container = document.getElementById("agenda-list");
  if (!container) return;

  const bookings = Bookings.getBookings?.() || [];

  const now = new Date();
  const todayStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  const todayBookings = bookings
    .filter(b => b.date === todayStr)
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
        <span class="agenda-time">${b.time}</span>
        <span class="agenda-name">${b.name} – ${b.occasion || ""}</span>
        <span class="agenda-guests">${b.guests || 0} fő</span>
      `;
      container.appendChild(div);
    });
  });
}

// ======================================================
// HETI RENDELÉS-TREND
// ======================================================
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

  const days = Object.keys(dayCounts).sort().slice(-7);
  const max = Math.max(...days.map(d => dayCounts[d]), 1);

  const dayNames = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

  container.innerHTML = `<div class="trend-chart">${days.map(d => {
    const [y, m, day] = d.split(".").map(Number);
    const weekday = dayNames[new Date(y, m - 1, day).getDay()];
    const count = dayCounts[d];
    const heightPct = Math.round((count / max) * 100);

    return `
      <div class="trend-bar-wrap">
        <span class="trend-bar-value">${count}</span>
        <div class="trend-bar" style="height: ${heightPct}%"></div>
        <span class="trend-bar-label">${weekday}</span>
      </div>
    `;
  }).join("")}</div>`;
}

// ======================================================
// LEGNÉPSZERŰBB MENÜK
// ======================================================
function renderTopItems() {
  const container = document.getElementById("top-items-list");
  if (!container) return;

  const orders = window.appData?.orders || [];
  const counts = {};

  orders.forEach(o => {
    const key = o.menu || "Ismeretlen";
    counts[key] = (counts[key] || 0) + (o.qty || 1);
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

// ======================================================
// LEGUTÓBBI ÜZENETEK
// ======================================================
function renderMessagesPreview() {
  const container = document.getElementById("messages-preview-list");

  const all = typeof messages !== "undefined" ? messages : [];

  const kpiEl = document.getElementById("stat-messages");
  if (kpiEl) kpiEl.textContent = all.length;

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
      <span class="msg-sender">${m.name}</span>
      <span class="msg-subject">${m.subject}</span>
    </div>
  `).join("");
}

// ======================================================
// REFRESH
// ======================================================
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

