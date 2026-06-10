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
 * 🚚 ORDER STATUS
 **********************/

const STATUS_OPTIONS = [
  "Új",
  "Elfogadva",
  "Készül",
  "Kiszállítás alatt",
  "Kézbesítve",
  "Sikertelen kézbesítés"
];

function renderOrders() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  const orders = window.appData.orders;

  tbody.innerHTML = orders.map(o => `
    <tr data-id="${o.id}">
      <td>${o.id}</td>
      <td>${o.name}</td>
      <td>${o.phone}</td>
      <td>${o.address}</td>
      <td>${o.menu}</td>
      <td>${o.qty}</td>
      <td class="order-time">${o.createdAt}</td>

      <td>
        <select class="status-select">
          ${STATUS_OPTIONS.map(s => `
            <option ${o.status === s ? "selected" : ""}>${s}</option>
          `).join("")}
        </select>
      </td>

      <td class="status-time">${o.statusChangedAt || ""}</td>

      <td>
        <button class="action-btn edit-btn">✏️</button>
        <button class="action-btn orders-delete-btn">🗑️</button>
      </td>
    </tr>
  `).join("");
  
  document.querySelectorAll(".status-select").forEach(select => {
    updateStatusColor(select);
  });
}

// ===============================
// STATUS CHANGE HANDLER
// ===============================
// A "change" eseménykezelő az orders.js-ben:
document.addEventListener("change", (e) => {
  if (!e.target.classList.contains("status-select")) return;

  const row = e.target.closest("tr");
  const id = row.dataset.id;
  const newValue = e.target.value;

  // 1. Megtaláljuk a rendelést a globális objektumban
  const order = window.appData.orders.find(o => o.id === id);
  
  if (order) {
    // 2. Módosítjuk az objektumot
    order.status = newValue;
    order.statusChangedAt = new Date().toLocaleTimeString("hu-HU", {hour: '2-digit', minute:'2-digit'});

    // 3. Biztosítjuk, hogy a DOM is tükrözze a változást
    renderOrders(); 

    // 4. FRISSÍTÉS: A dashboard logikája itt fut le újra
    if (typeof window.refreshDashboard === 'function') {
      console.log("Dashboard frissítése elindítva...");
      window.refreshDashboard();
    }
  }
});

function loadStatusLimits() {
  const saved = localStorage.getItem("statusLimits");

  if (saved) {
    statusLimits = JSON.parse(saved);
  }

  document.getElementById("limit-new").value = statusLimits["Új"];
  document.getElementById("limit-accepted").value = statusLimits["Elfogadva"];
  document.getElementById("limit-preparing").value = statusLimits["Készül"];
  document.getElementById("limit-delivery").value = statusLimits["Kiszállítás alatt"];
}

function saveStatusLimits() {
  statusLimits = {
    "Új": Number(document.getElementById("limit-new").value),
    "Elfogadva": Number(document.getElementById("limit-accepted").value),
    "Készül": Number(document.getElementById("limit-preparing").value),
    "Kiszállítás alatt": Number(document.getElementById("limit-delivery").value)
  };

  localStorage.setItem("statusLimits", JSON.stringify(statusLimits));

  refreshDashboard();

  alert("Beállítások mentve!");
}

function openEditModal(e) {
  editingRow = e.currentTarget.closest("tr");

  document.getElementById("editName").value = editingRow.cells[1].textContent;
  document.getElementById("editPhone").value = editingRow.cells[2].textContent;
  document.getElementById("editAddress").value = editingRow.cells[3].textContent;
  document.getElementById("editMenu").value = editingRow.cells[4].textContent;
  document.getElementById("editQty").value = editingRow.cells[5].textContent;

  document.getElementById("editModal").classList.remove("hidden");
}

function saveEdit() {
  if (!editingRow) return;

  editingRow.cells[1].textContent = document.getElementById("editName").value;
  editingRow.cells[2].textContent = document.getElementById("editPhone").value;
  editingRow.cells[3].textContent = document.getElementById("editAddress").value;
  editingRow.cells[4].textContent = document.getElementById("editMenu").value;
  editingRow.cells[5].textContent = document.getElementById("editQty").value;

  closeEditModal();
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
  editingRow = null;
}

function updateStatusColor(select) {
  select.classList.remove(
    "status-pending",
    "status-accepted",
    "status-preparing",
    "status-delivery",
    "status-done",
    "status-failed"
  );

  const map = {
    "Új": "status-pending",
    "Elfogadva": "status-accepted",
    "Készül": "status-preparing",
    "Kiszállítás alatt": "status-delivery",
    "Kézbesítve": "status-done",
    "Sikertelen kézbesítés": "status-failed"
  };

  select.classList.add(map[select.value]);
}

document.addEventListener("DOMContentLoaded", () => {
  renderOrders();
});

document.addEventListener("input", (e) => {
  if (e.target.id === "searchInput") {
    renderOrders();
  }
});

document.addEventListener("change", (e) => {
  if (e.target.id === "statusFilter") {
    renderOrders();
  }
});

window.filterOrders = function () {
  console.log("filterOrders fut");

  const searchEl = document.getElementById("searchInput");
  const statusEl = document.getElementById("statusFilter");

  const search = (searchEl?.value || "").toLowerCase().trim();
  const status = statusEl?.value || "all";

  const rows = document.querySelectorAll("#orders-section tbody tr");

  rows.forEach(row => {
    const name = (row.children[1]?.textContent || "").toLowerCase();
    const phone = (row.children[2]?.textContent || "").toLowerCase();
    const address = (row.children[3]?.textContent || "").toLowerCase();
    const menu = (row.children[4]?.textContent || "").toLowerCase();

    const rowStatus =
      row.querySelector(".status-select")?.value || "";

    const matchesSearch =
      search === "" || `${name} ${phone} ${address} ${menu}`.includes(search);

    const matchesStatus =
      status === "all" || rowStatus === status;

    row.style.display = (matchesSearch && matchesStatus) ? "" : "none";
  });
};

document.addEventListener("click", (e) => {
  // Ellenőrizzük, hogy a törlés gombra kattintottak-e
  if (e.target.classList.contains("orders-delete-btn")) {
    const row = e.target.closest("tr");
    const id = row.dataset.id;

    // Megerősítés (opcionális)
    if (!confirm("Biztosan törölni szeretnéd ezt a rendelést?")) return;

    // 1. Törlés az adathalmazból
    const index = window.appData.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      window.appData.orders.splice(index, 1);
    }

    // 2. Újrarenderelés
    renderOrders();

    // 3. Opcionális: Dashboard frissítése
    window.refreshDashboard?.();
  }
});