/**********************
 * 🔐 AUTH CHECK
 **********************/
document.addEventListener("DOMContentLoaded", () => {
  const isAdmin = localStorage.getItem("isAdmin");

  if (isAdmin !== "true") {

    alert("Ehhez az oldalhoz nincs jogosultsága!");

    window.location.replace("../html/homepage.html");
    return;
  }

  App.init();

});


/**********************
 * ❗ GLOBALS
 **********************/


window.APP_STATE = {
  statusLimits: {
    "Új": 30,
    "Elfogadva": 45,
    "Készül": 60,
    "Kiszállítás alatt": 90
  },

  bookingLimits: {
    warnNew: 60,
    problemNew: 180,
    warnConfirmed: 24
  }
};

let foodModalState = {
  category: null,
  editIndex: null
};

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
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userName");
    window.location.href = "../html/homepage.html";
  }

  return { logout };
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
const UI = (() => {
  function switchSection(targetId) {
    document.querySelectorAll(".section").forEach(s => {
      s.classList.remove("active");
    });

    const target = document.getElementById(targetId);
    if (target) {
      target.classList.add("active");
    }

    // sidebar szinkronizálása
    document.querySelectorAll(".menu a").forEach(a => {
      a.classList.toggle("active", a.dataset.target === targetId);
    });
    
    // generál egy véletlenszerű időt
     if (targetId === "orders-section") {
        refreshDashboard({ times: true }); //belépéskor is legyen random idő
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
  function bindEvents() {

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");

    // searchInput?.addEventListener("input", filterOrders);
    // statusFilter?.addEventListener("change", filterOrders);

    document.addEventListener("input", (e) => {
      if (e.target.id === "searchInput") {
        console.log("search change");
        filterOrders();
      }
    });

    document.addEventListener("change", (e) => {
      if (e.target.id === "statusFilter") {
        console.log("status change");
        filterOrders();
      }
    });

    document.querySelector(".admin-logout-btn")
      ?.addEventListener("click", Auth.logout);

    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        UI.switchTab(btn.dataset.tab, btn);
      });
    });

    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".edit-btn");
      if (!btn) return;

      openEditModal({ currentTarget: btn });
    });
  }

  function bindSidebar() {
    document.querySelectorAll(".menu a").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();

        const target = link.dataset.target;

        UI.switchSection(target);

        document.querySelectorAll(".menu a")
          .forEach(a => a.classList.remove("active"));

        link.classList.add("active");
      });
    });
  }

  function init() {

    //  KÖZÖS ORDERS STATE
    window.appData = window.appData || {};
    window.appData.orders = demoOrders;

    bindEvents();
    bindSidebar();
    Food.render();
    
    Bookings.render();

    updateDashboardStats();

    loadStatusLimits();

    refreshDashboard({ times: true });
  }

  return { init };
})();




