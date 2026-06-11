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

  const issuesEl = document.getElementById("stat-problem-orders");
  const issuesCard = issuesEl?.closest(".stat-card");

  if (issuesEl && issuesCard) {
    issuesEl.textContent = issues;
    issuesCard.classList.toggle("warning", issues > 0);
  }

  console.log("📊 Dashboard frissítve:", {
    total,
    active,
    delivery,
    issues
  });
}

// ======================================================
// ORDERS PROBLEM LIST
// ======================================================
function renderProblemOrders() {
  const container = document.getElementById("problem-orders-list");
  if (!container) return;

  container.innerHTML = "";

  const orders = window.appData?.orders || [];
  const todayOrders = orders.filter(o => isToday(o.createdAt));
  let hasProblem = false;

  // Státusz színek (a megadott 4 kategóriára)
  const statusColors = {
    "Új": "#d9534f",               // Piros
    "Elfogadva": "#f0ad4e",        // Narancs
    "Készül": "#5bc0de",           // Világoskék
    "Kiszállítás alatt": "#5cb85c" // Zöld
  };

  todayOrders.forEach(o => {
    if (!isProblemOrder(o)) return;
    hasProblem = true;

    const div = document.createElement("div");
    const status = (o.status || "").trim();
    const minutesAgo = getMinutesFromOrderTime(o.createdAt);
    
    // Lekérjük a limitet a settings-ből (feltételezve a globális változót)
    const limit = (typeof statusLimits !== 'undefined') ? (statusLimits[status] || 0) : 0;
    const color = statusColors[status] || "#666";

    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee; font-size: 0.85em;">
        
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 45%;">
            <strong>${o.name}</strong> <span style="color:#777;">(${o.phone || "-"})</span>
        </div>

        <div style="text-align: right; color: ${color}; font-weight: bold;">
            ${status}: ${minutesAgo} perc 
            <span style="font-weight: normal; color: #666; font-size: 0.9em;">(limit: ${limit}p)</span>
        </div>

      </div>
    `;

    container.appendChild(div);
  });

  if (!hasProblem) {
    container.innerHTML = "<p style='padding:10px; color:green;'>Nincs problémás rendelés 🎉</p>";
  }
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
  document.getElementById("stat-confirmed-bookings").textContent = confirmed;
  document.getElementById("stat-expected-guests").textContent = guests;
  document.getElementById("stat-problem-bookings").textContent = problems;

  console.log("📊 Booking dashboard:", { total, confirmed, guests, problems });
}

// ======================================================
// BOOKINGS PROBLEM LIST
// ======================================================
function renderProblemBookings() {
  const container = document.getElementById("problem-bookings-list");
  if (!container) return;

  container.innerHTML = "";

  const bookings = Bookings.getBookings?.() || [];

  let hasProblem = false;

  bookings.forEach(b => {

    const sla = getBookingSLA(b);
    if (sla.level === "ok") return;

    hasProblem = true;

    const div = document.createElement("div");
    div.className = "problem-item";

    div.innerHTML = `
      <span>
        <strong>${b.name}</strong> (${b.phone || "-"})
      </span>
      <span style="color:#ff4d4d;">
        ${sla.reason}
      </span>
    `;

    container.appendChild(div);
  });

  if (!hasProblem) {
    container.innerHTML = "<p>Nincs problémás foglalás 🎉</p>";
  }
}

// ======================================================
// REFRESH
// ======================================================
window.refreshDashboard = function () {
  updateDashboardStats();
  renderProblemOrders();
  renderProblemBookings();
  updateBookingDashboardStats();

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

