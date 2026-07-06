/**********************
 * 🔐 AUTH CHECK — dashboard védése
 *
 *   szerveroldali session ellenőrzés /api/auth/me/ végponton
 **********************/
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Session ellenőrzés: van-e érvényes bejelentkezés?
    const response = await fetch("/api/auth/me/", {
      credentials: "include",
    });

    if (!response.ok) {
      window.location.replace("/");
      return;
    }

    const user = await response.json();

    // /api/auth/me/ nem bejelentkezve: { authenticated: false }
    if (!user.id || user.authenticated === false || user.role !== "admin") {
      alert("Ehhez az oldalhoz nincs jogosultsága!");
      window.location.replace("/");
      return;
    }

    window.CURRENT_USER = user;
  } catch (error) {
    console.error("Auth ellenőrzés sikertelen:", error);
    window.location.replace("/");
    return;
  }

  try {
    await App.init();
  } catch (error) {
    console.error("Dashboard betöltése sikertelen:", error);
    window.showToast?.("A dashboard betöltése közben hiba történt.", "error");
  }
});


/**********************
 * ❗ GLOBALS
 **********************/


window.APP_STATE = {
  // SLA küszöbök — SlaRules.fetchSlaRules() tölti fel az API-ból (lásd sla-rules.js)
  statusLimits: {
    "Új": 30,
    "Elfogadva": 45,
    "Készül": 60,
    "Kiszállítás alatt": 90,
  },

  bookingLimits: {
    warnNew: 60,
    problemNew: 180,
    warnConfirmed: 24,
  },

  openingHours: {},
};

let foodModalState = {
  category: null,
  editIndex: null
};

/**********************
 * 📌 SIDEBAR ACTIVE
 **********************/
function setActiveSidebar() {
  const currentSection =
    document.querySelector(".section.active")?.id ||
    window.location.hash.replace("#", "");

  document.querySelectorAll(".menu a").forEach(link => {
    const target = link.dataset.target || link.getAttribute("href");

    if (target === currentSection) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}


/**********************
 * 🔐 AUTH MODULE
 **********************/
const Auth = (() => {
  function logout() {
    const modal = document.getElementById("logoutModal");
    if (!modal) return;

    modal.classList.remove("modal-hidden");
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeLogoutModal() {
    const modal = document.getElementById("logoutModal");
    if (!modal) return;

    modal.classList.remove("open");
    setTimeout(() => modal.classList.add("modal-hidden"), 200);
  }

  async function confirmLogout() {
    try {
      // Session törlése a szerveren, majd visszairányítás a főoldalra
      await fetch("/api/auth/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
    } catch (error) {
      console.error("Kijelentkezés sikertelen:", error);
    }

    window.location.href = "/";
  }

  return { logout, closeLogoutModal, confirmLogout };
})();


/**********************
 * 🧠 STORAGE MODULE
 **********************/
const Store = (() => {
  const KEY = "aranyfakanal_data";

  const defaultData = {
    foods: {
      appetizers: [],          // Előételek
      soups: [],               // Levesek
      fish: [],                // Halételek és Szárnyasok
      breaded: [],             // Hagyományos Rántott és Töltött Húsok
      roasted: [],             // Szaftos és Kemencés Sültek
      stews: [],               // Egytálételek
      desserts: [],            // Desszertek
      drinks: []               // Italok
    },
    weeklyMenu: {}
  };

  function load() {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : structuredClone(defaultData);
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  return { load, save };
})();

let appData = Store.load();


/**********************
 * 🎛️ UI MODULE
 **********************/
const SECTION_TITLES = {
  "dashboard-section": "Dashboard",
  "orders-section": "Rendelések",
  "menu-section": "Menük kezelése",
  "bookings-section": "Foglalások",
  "messages-section": "Üzenetek",
  "settings-section": "Beállítások",
};

const UI = (() => {
  function switchSection(targetId) {
    const leavingSettingsWithUnsaved =
      window.settingsDirty &&
      targetId !== "settings-section" &&
      document.getElementById("settings-section")?.classList.contains("active");

    if (leavingSettingsWithUnsaved) {
      const confirmed = window.confirm(
        "El nem mentett módosításaid vannak a Beállításokon. Biztosan elnavigálsz mentés nélkül?"
      );
      if (!confirmed) return;
      window.settingsDirty = false;
    }

    document.querySelectorAll(".section").forEach(s => {
      s.classList.remove("active");
    });

    const target = document.getElementById(targetId);
    if (target) {
      target.classList.add("active");
    }

    // topbar cím frissítése
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle && SECTION_TITLES[targetId]) {
      pageTitle.textContent = SECTION_TITLES[targetId];
    }

    // sidebar szinkronizálása
    document.querySelectorAll(".menu a").forEach(a => {
      a.classList.toggle("active", a.dataset.target === targetId);
    });

    // fixed-scroll elrendezés a rendelések, foglalások és üzenetek oldalon
    document.querySelector(".main")?.classList.toggle("orders-layout",   targetId === "orders-section");
    document.querySelector(".main")?.classList.toggle("bookings-layout", targetId === "bookings-section");
    document.querySelector(".main")?.classList.toggle("messages-layout", targetId === "messages-section");

    // generál egy véletlenszerű időt
    if (targetId === "orders-section") {
      refreshDashboard({ times: true });
    }
  }

  function switchTab(tabId, btn) {
    document.querySelectorAll(".tab-content").forEach(t => {
      t.classList.remove("active");
      t.classList.add("hidden");
    });

    const activeTab = document.getElementById(tabId);
    if (activeTab) {
      activeTab.classList.remove("hidden");
      activeTab.classList.add("active");
    }

    document.querySelectorAll(".tab").forEach(b => {
      b.classList.remove("active");
    });

    btn?.classList.add("active");
  }

  return {
    switchSection,
    switchTab
  };
})();


/**********************
 * 🍲 FOOD MODULE
 **********************/
const Food = (() => {
  let editState = { type: null, oldValue: null };

  function add(type, value) {
    if (!value) return;

    if (editState.oldValue) {
      const arr = appData.foods[type];
      const idx = arr.indexOf(editState.oldValue);

      if (idx !== -1) arr[idx] = value;

      editState = { type: null, oldValue: null };
    } else {
      if (!appData.foods[type].includes(value)) {
        appData.foods[type].push(value);
      }
    }

    save();
    render();
  }

  function remove(type, value) {
    appData.foods[type] = appData.foods[type].filter(x => x !== value);

    save();
    render();
  }

  function startEdit(type, value, input) {
    input.value = value;
    editState = { type, oldValue: value };
  }

  function save() {
    Store.save(appData);
  }

  function render() {
    renderList("appetizers", appData.foods.appetizers, "appetizer-list", "new-appetizers");
    renderList("soups", appData.foods.soups, "soup-list", "new-soups");
    renderList("fish", appData.foods.fish, "fish-list", "new-fish");
    renderList("breaded", appData.foods.breaded, "breaded-list", "new-breaded");
    renderList("roasted", appData.foods.roasted, "roasted-list", "new-roasted");
    renderList("stews", appData.foods.stews, "stew-list", "new-stews");
    renderList("desserts", appData.foods.desserts, "dessert-list", "new-desserts");
    renderList("drinks", appData.foods.drinks, "drink-list", "new-drinks");
  }

  function renderList(type, items, ulId, inputId) {
    const ul = document.getElementById(ulId);
    const input = document.getElementById(inputId);

    if (!ul) return;

    ul.innerHTML = "";

    items.forEach(item => {
      const li = document.createElement("li");

      li.innerHTML = `
        <div class="food-item">
          <span class="food-item-name">${item.name}</span>
          <span class="food-item-desc">${item.description || ""}</span>
        </div>

        <div class="food-actions">
          <span class="food-item-price">${item.price.toLocaleString()} Ft</span>
          <i class="fa-solid fa-pen edit"></i>
          <i class="fa-solid fa-trash delete"></i>
        </div>
      `;

      li.querySelector(".delete").onclick = () => remove(type, item);
      li.querySelector(".edit").onclick = () => startEdit(type, item, input);

      ul.appendChild(li);
    });
  }

  return { add, remove, render };
})();





/**********************
 * 🚀 APP
 **********************/
const App = (() => {
  let closeMobileSidebar = () => {};

  function bindEvents() {

    document.addEventListener("input", (e) => {
      if (e.target.id === "searchInput") {
        filterOrders();
      }
    });

    document.querySelector(".admin-logout-btn")
      ?.addEventListener("click", Auth.logout);

    const logoutModal = document.getElementById("logoutModal");
    document.getElementById("logoutCancel")
      ?.addEventListener("click", Auth.closeLogoutModal);
    document.getElementById("logoutCancelBtn")
      ?.addEventListener("click", Auth.closeLogoutModal);
    document.getElementById("logoutConfirmBtn")
      ?.addEventListener("click", Auth.confirmLogout);
    logoutModal?.addEventListener("click", (e) => {
      if (e.target === logoutModal) Auth.closeLogoutModal();
    });

    // Profil-chip kitöltése — adatok a session-ből (window.CURRENT_USER), nem localStorage-ból
    const userName = window.CURRENT_USER?.name;
    if (userName) {
      const initials = userName
        .split(" ")
        .map(word => word[0])
        .join("")
        .toUpperCase();

      const profileAvatar = document.getElementById("profileAvatar");
      const profileName = document.getElementById("profileName");

      if (profileAvatar) profileAvatar.textContent = initials;
      if (profileName) profileName.textContent = userName;
    }

    // Sidebar összecsukás (asztali ikon-csík nézet)
    const sidebar = document.querySelector(".sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    if (sidebar && sidebarToggle) {
      if (localStorage.getItem("sidebarCollapsed") === "true") {
        sidebar.classList.add("collapsed");
        sidebarToggle.setAttribute("aria-expanded", "false");
      }

      sidebarToggle.addEventListener("click", () => {
        const collapsed = sidebar.classList.toggle("collapsed");
        sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
        localStorage.setItem("sidebarCollapsed", String(collapsed));
      });
    }

    // Mobil sidebar-drawer (off-canvas, < 768px)
    const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");

    if (sidebar && mobileSidebarToggle && sidebarBackdrop) {
      let wasCollapsedBeforeOpen = false;

      const openMobileSidebar = () => {
        wasCollapsedBeforeOpen = sidebar.classList.contains("collapsed");
        sidebar.classList.remove("collapsed");
        sidebar.classList.add("mobile-open");
        sidebarBackdrop.classList.add("active");
        mobileSidebarToggle.setAttribute("aria-expanded", "true");
      };

      closeMobileSidebar = () => {
        sidebar.classList.remove("mobile-open");
        sidebarBackdrop.classList.remove("active");
        mobileSidebarToggle.setAttribute("aria-expanded", "false");
        if (wasCollapsedBeforeOpen) sidebar.classList.add("collapsed");
      };

      mobileSidebarToggle.addEventListener("click", openMobileSidebar);
      sidebarBackdrop.addEventListener("click", closeMobileSidebar);
    }

    // Topbar manuális frissítés gomb
    const refreshBtn = document.getElementById("refreshBtn");
    let refreshRotation = 0;
    refreshBtn?.addEventListener("click", async () => {
      if (document.getElementById("orders-section")?.classList.contains("active")) {
        try {
          await loadOrdersFromApi();
        } catch (error) {
          console.error("Rendelések frissítése sikertelen:", error);
          window.showToast?.("Nem sikerült frissíteni a rendeléseket.", "error");
        }
      }

      refreshDashboard({ times: true });

      if (document.getElementById("orders-section")?.classList.contains("active")) {
        if (typeof renderOrders === "function") renderOrders(true);
      }
      if (document.getElementById("bookings-section")?.classList.contains("active")) {
        if (typeof Bookings !== "undefined") {
          try {
            await Bookings.refresh();
            Bookings.renderBookings(true);
          } catch (error) {
            console.error("Foglalások frissítése sikertelen:", error);
            window.showToast?.("Nem sikerült frissíteni a foglalásokat.", "error");
          }
        }
      }
      if (document.getElementById("messages-section")?.classList.contains("active")) {
        if (typeof Messages !== "undefined") {
          try {
            await Messages.refresh();
          } catch (error) {
            console.error("Üzenetek frissítése sikertelen:", error);
            window.showToast?.("Nem sikerült frissíteni az üzeneteket.", "error");
          }
        }
      }
      if (document.getElementById("menu-section")?.classList.contains("active")) {
        if (typeof MenuManager !== "undefined") MenuManager.refresh();
      }
      refreshRotation += 360;
      refreshBtn.querySelector("i").style.transform = `rotate(${refreshRotation}deg)`;
    });

    // Teendők KPI -> ugrás a releváns kezeletlen listára (rendelés, ha van, különben foglalás)
    const kpiTodosCard = document.getElementById("kpi-todos");

    function activateTodosKpi() {
      if (!kpiTodosCard?.classList.contains("has-todos")) return;

      const ordersList = document.getElementById("todo-orders-list");
      const bookingsList = document.getElementById("todo-bookings-list");

      const hasOrderTodos = ordersList?.querySelector(".todo-item");
      const target = hasOrderTodos
        ? ordersList.closest(".dash-todos")
        : bookingsList?.closest(".dash-todos");

      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.remove("highlight");
      requestAnimationFrame(() => target.classList.add("highlight"));
      target.addEventListener("animationend", () => target.classList.remove("highlight"), { once: true });
    }

    kpiTodosCard?.addEventListener("click", activateTodosKpi);
    kpiTodosCard?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activateTodosKpi();
      }
    });

    // Dashboard gyorsműveletek -> sidebar szekcióváltás
    document.querySelectorAll(".quick-action-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        UI.switchSection(target);

        document.querySelectorAll(".menu a").forEach(a => {
          a.classList.toggle("active", a.dataset.target === target);
        });
      });
    });

    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        UI.switchTab(btn.dataset.tab, btn);
      });
    });

  }

  function bindSidebar() {
    document.querySelectorAll(".menu a").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();

        const target = link.dataset.target;

        UI.switchSection(target);
        closeMobileSidebar();

        document.querySelectorAll(".menu a")
          .forEach(a => a.classList.remove("active"));

        link.classList.add("active");
      });
    });
  }

  async function init() {

    window.appData = window.appData || {};

    try {
      await Promise.all([
        OpeningHours.fetchOpeningHours(),
        SlaRules.fetchSlaRules(),
      ]);
    } catch (error) {
      console.error("Beállítások betöltése sikertelen:", error);
      window.showToast?.("Beállítások betöltése sikertelen", "error");
    }

    // Rendelések betöltése az adatbázisból (demoOrders helyett)
    try {
      await loadOrdersFromApi();
    } catch (error) {
      console.error("Rendelések betöltése sikertelen:", error);
      window.appData.orders = [];
      window.showToast?.("Nem sikerült betölteni a rendeléseket.", "error");
    }

    bindEvents();
    bindSidebar();
    Food.render();

    MenuManager.render();
    await Bookings.render();
    await Messages.render();

    updateDashboardStats();

    loadStatusLimits();

    if (typeof renderOrders === "function") {
      renderOrders();
    }

    refreshDashboard({ times: true });
  }

  return { init };
})();


/**********************
 * 🔔 TOAST MODUL
 * A showToast függvény közös komponensbe lett kiemelve:
 * static/js/toast.js — betöltve a dashboard/index.html <head>-jében.
 **********************/




