const MenuManager = (() => {

  /* ================= STATE ================= */
  let menuEventsBound = false;
  let pendingDeleteId = null;          // food.id
  let pendingCategoryDeleteId = null;  // category.id
  let pendingDayMenuDelete = null;     // day name
  let foodSearchTerm = '';

  /*
   * ======================== HETI MENÜ — API állapot ========================
   *
   * Adatfolyam (olvasás):
   *   1) GET /api/weekly-menu-items/     → WeeklyMenuItem tábla (katalógus, legördülő)
   *   2) GET /api/weekly-menu/?week_start= → WeeklyMenu tábla (aktuális hét A/B menüi)
   *   3) A válasz JSON-ból összerakjuk a weeklyMenu objektumot (memória, UI-hoz)
   *
   * Adatfolyam (mentés):
   *   1) A legördülőből WeeklyMenuItem *id* (soup, main_course, dessert)
   *   2) POST /api/weekly-menu/create/  VAGY  PATCH /api/weekly-menu/<id>/
   *   3) A backend a serializerrel INSERT / UPDATE-et ír az adatbázisba
   *
   * weeklyMenu struktúra (csak a böngészőben, nem adatbázis):
   *   { "Hétfő": { A: { id, soupId, leves, ... }, B: { ... } }, ... }
   */
  const WEEKLY_MENU_API = "/api/weekly-menu/";
  const WEEKLY_MENU_ITEMS_API = "/api/weekly-menu-items/";
  let weeklyMenuItemsLoaded = false;
  let weeklyMenu = {};

  /*
   * ======================== ÉTELEK FÜL — API állapot ========================
   * GET /api/categories/  GET /api/menu/  GET /api/allergens/
   * Mentés: POST/PATCH/DELETE /api/menu/…  és /api/categories/…
   */
  const CATEGORIES_API = "/api/categories/";
  const MENU_API = "/api/menu/";
  const ALLERGENS_API = "/api/allergens/";
  let categories = [];
  let foods = [];
  let ALLERGENS = [];
  let activeCategoryId = null;
  let menuDataLoaded = false;

  const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];

  /* ================= SEGÉDFÜGGVÉNYEK ================= */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function sameId(a, b) {
    return String(a) === String(b);
  }

  function foodsByCategory(catId) {
    return foods.filter((f) => sameId(f.categoryId, catId));
  }

  function filteredFoodsByCategory(catId) {
    const term = foodSearchTerm.trim().toLowerCase();
    const list = foodsByCategory(catId);
    if (!term) return list;
    return list.filter(f => f.nev.toLowerCase().includes(term) || f.leiras.toLowerCase().includes(term));
  }

  function dayMenuSummaryHtml(menu) {
    if (!menu) return '<span class="weekly-menu-empty">Még nincs beállítva</span>';
    return `${escapeHtml(menu.leves)} · ${escapeHtml(menu.foetel)} · ${escapeHtml(menu.desszert)} (${escapeHtml(menu.ar)})`;
  }

  function weeklyMenuRowHtml(day) {
    const entry = weeklyMenu[day];
    const deleteBtn = entry
      ? `<button type="button" class="action-btn day-menu-delete-btn" data-day="${escapeHtml(day)}" aria-label="Törlés"><i class="fa-solid fa-trash"></i></button>`
      : '';

    return `
    <tr>
        <td data-label="Nap">${escapeHtml(day)}</td>
        <td data-label="A menü">${dayMenuSummaryHtml(entry?.A)}</td>
        <td data-label="B menü">${dayMenuSummaryHtml(entry?.B)}</td>
        <td class="actions" data-label="Műveletek">
            <button type="button" class="action-btn day-menu-edit-btn" data-day="${escapeHtml(day)}" aria-label="Szerkesztés"><i class="fa-solid fa-pen"></i></button>
            ${deleteBtn}
        </td>
    </tr>`;
  }

  function renderWeeklyMenuTable() {
    const tbody = document.getElementById('weeklyMenuBody');
    if (!tbody) return;
    tbody.innerHTML = days.map(weeklyMenuRowHtml).join('');
  }

  function foodAllergenIconsHtml(allergenKeys) {
    if (!allergenKeys || !allergenKeys.length) return '';
    const icons = allergenKeys
      .map(key => ALLERGENS.find(a => a.key === key))
      .filter(Boolean)
      .map(a => `<img src="${a.icon}" alt="${escapeHtml(a.name)}" title="${escapeHtml(a.name)}" class="food-allergen-icon">`)
      .join('');
    return `<div class="food-allergen-icons">${icons}</div>`;
  }

  function generateRows(items) {
    return items.map(item => {
      const unavailable = item.available === false;
      const badge = unavailable
        ? `<button type="button" class="food-availability-badge" data-food-id="${item.id}" aria-label="Visszaállítás elérhetővé">Kifutott</button>`
        : '';

      return `
    <tr class="${unavailable ? 'food-row-unavailable' : ''}">
        <td data-label="Név">${escapeHtml(item.nev)}${badge}${foodAllergenIconsHtml(item.allergens)}</td>
        <td data-label="Ár">${escapeHtml(item.ar)}</td>
        <td data-label="Leírás">${escapeHtml(item.leiras)}</td>
        <td class="actions" data-label="Műveletek">
            <button type="button" class="action-btn menu-edit-btn" data-food-id="${item.id}" aria-label="Szerkesztés"><i class="fa-solid fa-pen"></i></button>
            <button type="button" class="action-btn menu-delete-btn" data-food-id="${item.id}" aria-label="Törlés"><i class="fa-solid fa-trash"></i></button>
        </td>
    </tr>`;
    }).join('');
  }

  function categoryListItemHtml(cat, isActive) {
    return `
    <li class="cat-item ${isActive ? 'active' : ''}" data-cat-id="${cat.id}">
        <span class="cat-item-name">${escapeHtml(cat.name)}</span>
        <span class="cat-item-actions">
            <button type="button" class="cat-action-btn cat-rename-btn" data-cat-id="${cat.id}" aria-label="Kategória átnevezése"><i class="fa-solid fa-pen"></i></button>
            <button type="button" class="cat-action-btn cat-delete-btn" data-cat-id="${cat.id}" aria-label="Kategória törlése"><i class="fa-solid fa-trash"></i></button>
        </span>
    </li>`;
  }

  function renderCategorySidebar() {
    const ul = document.querySelector('.category-sidebar ul');
    if (!ul) return;
    ul.innerHTML = categories.map(cat => categoryListItemHtml(cat, sameId(cat.id, activeCategoryId))).join('');
  }

  function refreshFoodTableArea() {
    const category = categories.find((c) => sameId(c.id, activeCategoryId));
    const title = document.getElementById('category-title');
    if (title) title.textContent = category?.name || '';
    const tbody = document.querySelector('.food-table tbody');
    if (tbody) tbody.innerHTML = generateRows(filteredFoodsByCategory(activeCategoryId));
  }

  const contentData = {
    'heti-menu': `
        <div class="weekly-menu-card">
            <table class="weekly-menu-table">
                <thead><tr><th>Nap</th><th>A menü</th><th>B menü</th><th>Műveletek</th></tr></thead>
                <tbody id="weeklyMenuBody"></tbody>
            </table>
        </div>`,
    'etelek': `
        <div class="content-card">
            <aside class="category-sidebar">
                <div class="category-sidebar-header">
                    <h3>Kategóriák</h3>
                    <button type="button" class="category-add-btn" aria-label="Új kategória hozzáadása"><i class="fa-solid fa-plus"></i></button>
                </div>
                <ul></ul>
            </aside>
            <main class="category-table-area">
                <div class="table-header"><h2 id="category-title"></h2><button type="button" class="add-btn">+ Új étel hozzáadása</button></div>
                <div class="food-search-row">
                    <div class="search-wrap">
                        <i class="fa-solid fa-magnifying-glass search-icon"></i>
                        <input type="text" id="foodSearchInput" placeholder="Keresés..." aria-label="Étel keresése">
                    </div>
                </div>
                <div class="table-wrapper"><table class="food-table"><thead><tr><th>Név</th><th>Ár</th><th>Leírás</th><th>Műveletek</th></tr></thead><tbody></tbody></table></div>
            </main>
        </div>`
  };

  /* ================= TARTALOM BETÖLTÉS ================= */
  function loadContent(target) {
    const container = document.querySelector('.tab-content');
    if (!container) return;
    container.innerHTML = contentData[target];

    if (target === 'heti-menu') {
      // Heti menü fül: előbb katalógus + menük letöltése API-ból, aztán táblázat rajzolása
      Promise.all([loadWeeklyMenuItems(), loadWeeklyMenuFromApi()])
        .then(() => renderWeeklyMenuTable())
        .catch((err) => {
          console.error("Heti menü betöltése sikertelen:", err);
          window.showToast?.("Nem sikerült betölteni a heti menüt.", "error");
        });
    }
    if (target === 'etelek') {
      foodSearchTerm = '';
      loadMenuTabData()
        .then(() => {
          if (!categories.some((c) => sameId(c.id, activeCategoryId))) {
            activeCategoryId = categories[0]?.id ?? null;
          }
          renderCategorySidebar();
          refreshFoodTableArea();
        })
        .catch((err) => {
          console.error("Étlap betöltése sikertelen:", err);
          window.showToast?.("Nem sikerült betölteni az ételeket.", "error");
        });
    }
  }

  /* ================= ÉTEL MODAL (hozzáadás/szerkesztés) ================= */
  function renderAllergenChecklist(selectedKeys) {
    const container = document.getElementById('allergenChecklist');
    if (!container) return;
    container.innerHTML = ALLERGENS.map(a => `
      <label class="allergen-check">
        <input type="checkbox" value="${a.key}" ${selectedKeys.includes(a.key) ? 'checked' : ''}>
        <span class="allergen-check-icon-box"><img src="${a.icon}" alt="" class="allergen-check-icon"></span>
        <span>${escapeHtml(a.name)}</span>
      </label>`).join('');
  }

  function getCheckedAllergens() {
    return Array.from(document.querySelectorAll('#allergenChecklist input:checked')).map(cb => cb.value);
  }

  function resetFoodModal(modal) {
    document.getElementById('food-name').value = "";
    document.getElementById('food-desc').value = "";
    document.getElementById('food-price').value = "";
    document.getElementById('food-available').checked = true;
    document.getElementById('modal-cat-name').textContent = "";
    renderAllergenChecklist([]);

    delete modal.dataset.mode;
    delete modal.dataset.foodId;
  }

  function openAddFoodModal() {
    const modal = document.getElementById('modal-overlay');
    resetFoodModal(modal);
    modal.dataset.mode = 'add';
    document.getElementById('foodModalTitle').textContent = 'Új étel hozzáadása';
    const category = categories.find((c) => sameId(c.id, activeCategoryId));
    document.getElementById('modal-cat-name').textContent = category?.name || '';
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function openEditFoodModal(foodId) {
    const modal = document.getElementById('modal-overlay');
    const item = foods.find((f) => sameId(f.id, foodId));
    if (!item) return;

    document.getElementById('foodModalTitle').textContent = 'Étel szerkesztése';
    const category = categories.find((c) => sameId(c.id, item.categoryId));
    document.getElementById('modal-cat-name').textContent = category?.name || '';
    document.getElementById('food-name').value = item.nev;
    document.getElementById('food-desc').value = item.leiras;
    document.getElementById('food-price').value = parseInt(item.ar);
    document.getElementById('food-available').checked = item.available !== false;
    renderAllergenChecklist(item.allergens || []);
    modal.dataset.mode = 'edit';
    modal.dataset.foodId = foodId;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeFoodModal() {
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('open');
    setTimeout(() => {
      resetFoodModal(modal);
      modal.classList.add('hidden');
    }, 150);
  }

  async function saveFoodModal() {
    const modal = document.getElementById('modal-overlay');
    const nameInput = document.getElementById('food-name');
    const priceInput = document.getElementById('food-price');
    const descInput = document.getElementById('food-desc');
    const availableInput = document.getElementById('food-available');

    if (!nameInput.value.trim() || !priceInput.value.trim()) {
      window.showToast?.('Kérlek, töltsd ki a nevet és az árat!', 'error');
      return;
    }

    const mode = modal.dataset.mode;
    const foodFields = {
      nev: nameInput.value.trim(),
      ar: priceInput.value.trim() + ' Ft',
      leiras: descInput.value.trim(),
      available: availableInput.checked,
      allergens: getCheckedAllergens(),
    };

    try {
      if (mode === 'edit') {
        const existing = foods.find((f) => sameId(f.id, modal.dataset.foodId));
        if (!existing) return;

        const response = await menuApiRequest(`${MENU_API}${existing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(foodToApiPayload(foodFields, existing.categoryId)),
        });
        if (!response.ok) {
          throw new Error(await parseApiError(response, "Az étel mentése sikertelen."));
        }
        activeCategoryId = existing.categoryId;
      } else {
        const response = await menuApiRequest(`${MENU_API}create/`, {
          method: "POST",
          body: JSON.stringify(foodToApiPayload(foodFields, activeCategoryId)),
        });
        if (!response.ok) {
          throw new Error(await parseApiError(response, "Az étel hozzáadása sikertelen."));
        }
      }

      await loadFoodsFromApi();
      refreshFoodTableArea();
      closeFoodModal();
      window.showToast?.(mode === 'edit' ? 'Étel mentve' : 'Étel hozzáadva', 'success');
    } catch (err) {
      console.error(err);
      window.showToast?.(err.message || "Mentés sikertelen.", "error");
    }
  }

  /* ================= ÉTEL TÖRLÉS MEGERŐSÍTŐ MODAL ================= */
  function openMenuDeleteConfirm(foodId) {
    pendingDeleteId = foodId;
    const modal = document.getElementById('menuDeleteConfirmModal');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeMenuDeleteConfirm() {
    const modal = document.getElementById('menuDeleteConfirmModal');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 150);
    pendingDeleteId = null;
  }

  async function confirmMenuDelete() {
    if (!pendingDeleteId) return;
    const food = foods.find((f) => sameId(f.id, pendingDeleteId));
    if (!food) { closeMenuDeleteConfirm(); return; }

    try {
      const response = await menuApiRequest(`${MENU_API}${food.id}/`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await parseApiError(response, "Az étel törlése sikertelen."));
      }
      await loadFoodsFromApi();
      refreshFoodTableArea();
      closeMenuDeleteConfirm();
      window.showToast?.('Étel törölve', 'deleted');
    } catch (err) {
      console.error(err);
      window.showToast?.(err.message || "Törlés sikertelen.", "error");
    }
  }

  /* ================= KATEGÓRIA MODAL (hozzáadás/átnevezés) ================= */
  function openAddCategoryModal() {
    const modal = document.getElementById('category-modal-overlay');
    document.getElementById('categoryModalTitle').textContent = 'Új kategória';
    document.getElementById('category-name').value = '';
    modal.dataset.mode = 'add';
    delete modal.dataset.catId;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function openRenameCategoryModal(catId) {
    const category = categories.find((c) => sameId(c.id, catId));
    if (!category) return;

    const modal = document.getElementById('category-modal-overlay');
    document.getElementById('categoryModalTitle').textContent = 'Kategória átnevezése';
    document.getElementById('category-name').value = category.name;
    modal.dataset.mode = 'rename';
    modal.dataset.catId = catId;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeCategoryModal() {
    const modal = document.getElementById('category-modal-overlay');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 150);
  }

  async function saveCategoryModal() {
    const modal = document.getElementById('category-modal-overlay');
    const nameInput = document.getElementById('category-name');
    const name = nameInput.value.trim();

    if (!name) {
      window.showToast?.('Kérlek, adj nevet a kategóriának!', 'error');
      return;
    }

    const mode = modal.dataset.mode;

    try {
      if (mode === 'rename') {
        const category = categories.find((c) => sameId(c.id, modal.dataset.catId));
        if (!category) return;

        const response = await menuApiRequest(`${CATEGORIES_API}${category.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        if (!response.ok) {
          throw new Error(await parseApiError(response, "A kategória mentése sikertelen."));
        }
      } else {
        const response = await menuApiRequest(`${CATEGORIES_API}create/`, {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        if (!response.ok) {
          throw new Error(await parseApiError(response, "A kategória hozzáadása sikertelen."));
        }
        const created = await response.json();
        activeCategoryId = created.id;
      }

      await loadCategoriesFromApi();
      if (mode === 'rename' && sameId(activeCategoryId, modal.dataset.catId)) {
        refreshFoodTableArea();
      } else if (mode !== 'rename') {
        refreshFoodTableArea();
      }
      renderCategorySidebar();
      closeCategoryModal();
      window.showToast?.(mode === 'rename' ? 'Kategória átnevezve' : 'Kategória hozzáadva', 'success');
    } catch (err) {
      console.error(err);
      window.showToast?.(err.message || "Mentés sikertelen.", "error");
    }
  }

  /* ================= KATEGÓRIA TÖRLÉS MEGERŐSÍTŐ MODAL ================= */
  function openCategoryDeleteConfirm(catId) {
    const category = categories.find((c) => sameId(c.id, catId));
    if (!category) return;
    pendingCategoryDeleteId = catId;

    const count = foodsByCategory(catId).length;
    const body = document.getElementById('categoryDeleteConfirmBody');
    if (body) {
      body.textContent = count > 0
        ? `Biztosan törölni szeretnéd a "${category.name}" kategóriát és a benne lévő ${count} ételt? Ez a művelet nem vonható vissza.`
        : `Biztosan törölni szeretnéd a "${category.name}" kategóriát? Ez a művelet nem vonható vissza.`;
    }

    const modal = document.getElementById('categoryDeleteConfirmModal');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeCategoryDeleteConfirm() {
    const modal = document.getElementById('categoryDeleteConfirmModal');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 150);
    pendingCategoryDeleteId = null;
  }

  async function confirmCategoryDelete() {
    if (!pendingCategoryDeleteId) return;
    const catId = pendingCategoryDeleteId;
    const category = categories.find((c) => sameId(c.id, catId));
    if (!category) { closeCategoryDeleteConfirm(); return; }

    try {
      const response = await menuApiRequest(`${CATEGORIES_API}${category.id}/`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response, "A kategória törlése sikertelen."));
      }

      await Promise.all([loadCategoriesFromApi(), loadFoodsFromApi()]);

      if (sameId(activeCategoryId, catId)) {
        activeCategoryId = categories[0]?.id ?? null;
      }

      renderCategorySidebar();
      refreshFoodTableArea();
      closeCategoryDeleteConfirm();
      window.showToast?.('Kategória törölve', 'deleted');
    } catch (err) {
      console.error(err);
      window.showToast?.(err.message || "Törlés sikertelen.", "error");
    }
  }

  /*
   * ================= HETI MENÜ — API hívások (adatbázis ↔ böngésző) =================
   */

  /** CSRF token a POST/PATCH/DELETE kérésekhez (Django session). */
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  /** Közös fetch wrapper: JSON + session cookie + CSRF. */
  async function menuApiRequest(url, options = {}) {
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

  /** API válasz → dashboard táblázat sor */
  function foodFromApi(item) {
    return {
      id: item.id,
      categoryId: item.category.id,
      nev: item.name,
      ar: `${Math.round(parseFloat(item.price))} Ft`,
      leiras: item.description || "",
      available: item.is_available,
      allergens: (item.allergens || []).map((a) => a.key),
    };
  }

  /** Űrlap → API mentés */
  function foodToApiPayload(foodFields, categoryId) {
    const price = parseInt(String(foodFields.ar).replace(/\D/g, ""), 10);
    return {
      name: foodFields.nev,
      description: foodFields.leiras,
      price,
      category: categoryId,
      is_available: foodFields.available,
      allergen_keys: foodFields.allergens || [],
    };
  }

  async function loadAllergensFromApi() {
    const response = await menuApiRequest(ALLERGENS_API);
    if (!response.ok) throw new Error("Nem sikerült betölteni az allergéneket.");
    ALLERGENS = await response.json();
  }

  async function loadCategoriesFromApi() {
    const response = await menuApiRequest(CATEGORIES_API);
    if (!response.ok) throw new Error("Nem sikerült betölteni a kategóriákat.");
    categories = await response.json();
  }

  async function loadFoodsFromApi() {
    const response = await menuApiRequest(MENU_API);
    if (!response.ok) throw new Error("Nem sikerült betölteni az ételeket.");
    foods = (await response.json()).map(foodFromApi);
  }

  async function loadMenuTabData(force = false) {
    if (menuDataLoaded && !force) return;
    await Promise.all([loadAllergensFromApi(), loadCategoriesFromApi(), loadFoodsFromApi()]);
    menuDataLoaded = true;
  }

  async function parseApiError(response, fallback) {
    try {
      const data = await response.json();
      return data.detail || fallback;
    } catch (_err) {
      return fallback;
    }
  }

  /** Aktuális hét hétfőjének dátuma (YYYY-MM-DD). Ezt küldjük week_start paraméterként. */
  function getCurrentWeekMonday() {
    /**
     * A dashboard heti menü szerkesztése és a publikus rendelési oldal "szezonja"
     * (amire a vendég a napokat látja) nem mindig ugyanarra a hétre mutat.
     *
     * A rendelési oldalon a hét eltolódik, ha vasárnap / péntek / szombat van.
     * A dashboardon is ezt a logikát kell követni, különben "csütörtököt"
     * máshol törlünk, mint amit a vendég lát.
     */
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const dow = now.getDay(); // 0=vasárnap ... 6=szombat

    // aktuális hétfő
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dow + 6) % 7));

    // rendelések oldala: ha péntek/szombat/vasárnap van, akkor a következő hétre vált
    if (dow === 5 || dow === 6 || dow === 0) {
      monday.setDate(monday.getDate() + 7);
    }

    return monday.toISOString().slice(0, 10);
  }

  /** Magyar napnév → konkrét dátum az aktuális héten (mentéskor a backend day mezője). */
  function getDateForDayName(dayName) {
    const offsets = { Hétfő: 0, Kedd: 1, Szerda: 2, Csütörtök: 3, Péntek: 4 };
    const monday = new Date(`${getCurrentWeekMonday()}T12:00:00`);
    const target = new Date(monday);
    target.setDate(monday.getDate() + (offsets[dayName] ?? 0));
    return target.toISOString().slice(0, 10);
  }

  /** API-ból jövő ISO dátum → „Hétfő” … „Péntek” (csak munkanapok). */
  function dayNameFromIsoDate(isoDate) {
    const date = new Date(`${isoDate}T12:00:00`);
    const names = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
    const name = names[date.getDay()];
    return days.includes(name) ? name : null;
  }

  /**
   * KATALÓGUS BETÖLTÉSE (WeeklyMenuItem tábla → böngésző memória).
   * GET /api/weekly-menu-items/
   * Az eredmény a WeeklyMenuCombobox modulba kerül (legördülő listák).
   */
  async function loadWeeklyMenuItems(force = false) {
    if (weeklyMenuItemsLoaded && !force) return;

    const response = await menuApiRequest(WEEKLY_MENU_ITEMS_API);
    if (!response.ok) {
      throw new Error("Nem sikerült betölteni a heti menü tételeket.");
    }

    const items = await response.json();
    window.WeeklyMenuCombobox?.setItems(items);
    weeklyMenuItemsLoaded = true;
  }

  /**
   * HETI MENÜ BETÖLTÉSE (WeeklyMenu tábla → weeklyMenu objektum).
   * GET /api/weekly-menu/?week_start=<hétfő>
   * A válasz tömb: minden sor egy A vagy B menü egy napra, beágyazott soup/main/dessert objektumokkal.
   */
  async function loadWeeklyMenuFromApi() {
    const weekStart = getCurrentWeekMonday();
    const response = await menuApiRequest(`${WEEKLY_MENU_API}?week_start=${weekStart}`);
    if (!response.ok) {
      throw new Error("Nem sikerült betölteni a heti menüt.");
    }

    const data = await response.json();
    weeklyMenu = {};

    data.forEach((item) => {
      // Soft delete után (is_available=false) admin is kapja a rekordot,
      // de a heti táblában ezt "nincs beállítva" állapotként kezeljük.
      if (item.is_available === false) return;
      const dayName = dayNameFromIsoDate(item.day);
      if (!dayName) return;

      if (!weeklyMenu[dayName]) weeklyMenu[dayName] = {};
      // item.id = WeeklyMenu sor azonosítója (PATCH/DELETE-hez kell)
      // soupId / mainCourseId / dessertId = WeeklyMenuItem FK-k (legördülő visszatöltéshez)
      weeklyMenu[dayName][item.menu_type] = {
        id: item.id,
        soupId: item.soup?.id ?? null,
        mainCourseId: item.main_course?.id ?? null,
        dessertId: item.dessert?.id ?? null,
        leves: item.soup?.name || "",
        foetel: item.main_course?.name || "",
        desszert: item.dessert?.name || "",
        ar: `${Math.round(parseFloat(item.price))} Ft`,
        price: item.price,
      };
    });
  }

  /**
   * EGY A VAGY B MENÜ MENTÉSE az adatbázisba.
   * - Ha existingId van → PATCH (UPDATE a WeeklyMenu táblában)
   * - Ha nincs id → POST create/ (INSERT új WeeklyMenu sor)
   * A soup/main_course/dessert mezőkben a WeeklyMenuItem id-k mennek (nem a név!).
   */
  async function saveWeeklyMenuSlot(dayName, menuType, prefix, existingId, priceValue) {
    const soupId = window.WeeklyMenuCombobox?.getValue(`${prefix}-leves`);
    const mainCourseId = window.WeeklyMenuCombobox?.getValue(`${prefix}-foetel`);
    const dessertId = window.WeeklyMenuCombobox?.getValue(`${prefix}-desszert`);

    if (!soupId || !mainCourseId || !dessertId || !priceValue) {
      throw new Error("missing_fields");
    }

    const payload = {
      day: getDateForDayName(dayName),  // pl. "2026-07-07"
      menu_type: menuType,              // "A" vagy "B"
      soup: soupId,                     // WeeklyMenuItem.id
      main_course: mainCourseId,
      dessert: dessertId,
      price: priceValue,
      is_available: true,
    };

    const url = existingId ? `${WEEKLY_MENU_API}${existingId}/` : `${WEEKLY_MENU_API}create/`;
    const method = existingId ? "PATCH" : "POST";
    const response = await menuApiRequest(url, {
      method,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw err;
    }

    return response.json();
  }

  /**
   * Egy nap teljes törlése: A + B WeeklyMenu sor DELETE az adatbázisból.
   * (A WeeklyMenuItem katalógus tételek megmaradnak.)
   */
  async function deleteWeeklyMenuDay(dayName) {
    const entry = weeklyMenu[dayName];
    if (!entry) return;

    const requests = ["A", "B"]
      .filter((menuType) => entry[menuType]?.id)
      .map((menuType) =>
        menuApiRequest(`${WEEKLY_MENU_API}${entry[menuType].id}/`, { method: "DELETE" }),
      );

    const responses = await Promise.all(requests);
    const payloads = await Promise.all(
      responses.map(async (response) => {
        const data = await response.json().catch(() => ({}));
        return { response, data };
      }),
    );

    const failed = payloads.find(({ response }) => !response.ok);
    if (failed) {
      throw new Error(failed.data?.detail || "A napi menü törlése sikertelen.");
    }

    return {
      softDeletedCount: payloads.filter(({ data }) => data?.soft_deleted).length,
    };
  }

  async function refreshWeeklyMenuTable() {
    await loadWeeklyMenuFromApi();
    renderWeeklyMenuTable();
  }

  /* ================= NAPI MENÜ MODAL — szerkesztő űrlap ================= */
  async function openDayMenuModal(day) {
    try {
      // Katalógus betöltése, ha még nincs (legördülőhöz)
      await loadWeeklyMenuItems();
    } catch (err) {
      console.error(err);
      window.showToast?.("Nem sikerült betölteni a menü tételeket.", "error");
      return;
    }

    const modal = document.getElementById("day-menu-modal-overlay");
    const entry = weeklyMenu[day] || {};
    const a = entry.A || {};
    const b = entry.B || {};

    document.getElementById("dayMenuModalTitle").textContent = `${day} menüje`;
    // Megjelenített név a szövegmezőben, id a rejtett mezőben (mentéskor az id megy a backendnek)
    window.WeeklyMenuCombobox?.setValue("day-a-leves", a.soupId, a.leves);
    window.WeeklyMenuCombobox?.setValue("day-a-foetel", a.mainCourseId, a.foetel);
    window.WeeklyMenuCombobox?.setValue("day-a-desszert", a.dessertId, a.desszert);
    window.WeeklyMenuCombobox?.setValue("day-b-leves", b.soupId, b.leves);
    window.WeeklyMenuCombobox?.setValue("day-b-foetel", b.mainCourseId, b.foetel);
    window.WeeklyMenuCombobox?.setValue("day-b-desszert", b.dessertId, b.desszert);
    const sharedPrice = a.price ?? b.price ?? "";
    document.getElementById("day-menu-ar").value = sharedPrice ? Math.round(parseFloat(sharedPrice)) : "";

    // Szerkesztés/Törlés gombok frissítése minden comboboxnál
    ["day-a-leves", "day-a-foetel", "day-a-desszert", "day-b-leves", "day-b-foetel", "day-b-desszert"]
      .forEach((id) => window.WeeklyMenuCombobox?.updateItemActions(id));

    modal.dataset.day = day;
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeDayMenuModal() {
    const modal = document.getElementById('day-menu-modal-overlay');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 150);
  }

  /** Mentés: A és B menü külön API hívás, majd újraolvasás az adatbázisból. */
  async function saveDayMenuModal() {
    const modal = document.getElementById("day-menu-modal-overlay");
    const day = modal.dataset.day;
    if (!day) return;
    const sharedPrice = document.getElementById("day-menu-ar")?.value?.trim();

    const entry = weeklyMenu[day] || {};

    try {
      await saveWeeklyMenuSlot(day, "A", "day-a", entry.A?.id ?? null, sharedPrice);
      await saveWeeklyMenuSlot(day, "B", "day-b", entry.B?.id ?? null, sharedPrice);
      await loadWeeklyMenuFromApi();
      renderWeeklyMenuTable();
      window.showToast?.("Heti menü mentve", "success");
      closeDayMenuModal();
    } catch (err) {
      if (err?.message === "missing_fields") {
        window.showToast?.("Kérlek, minden mezőt tölts ki!", "error");
        return;
      }
      console.error("Heti menü mentése sikertelen:", err);
      const message = typeof parseApiError === "function"
        ? parseApiError(err, "Mentés sikertelen!")
        : "Mentés sikertelen!";
      window.showToast?.(message, "error");
    }
  }

  /* ================= NAPI MENÜ TÖRLÉS MEGERŐSÍTŐ MODAL ================= */
  function openDayMenuDeleteConfirm(day) {
    pendingDayMenuDelete = day;
    const body = document.getElementById('dayMenuDeleteConfirmBody');
    if (body) body.textContent = `Biztosan törlöd "${day}" menüjét? Ez a művelet nem vonható vissza.`;

    const modal = document.getElementById('dayMenuDeleteConfirmModal');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeDayMenuDeleteConfirm() {
    const modal = document.getElementById('dayMenuDeleteConfirmModal');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 150);
    pendingDayMenuDelete = null;
  }

  async function confirmDayMenuDelete() {
    if (!pendingDayMenuDelete) return;

    try {
      const result = await deleteWeeklyMenuDay(pendingDayMenuDelete);
      await refreshWeeklyMenuTable();
      const softDeletedCount = result?.softDeletedCount ?? 0;
      if (softDeletedCount > 0) {
        window.showToast?.("A menü rendelés miatt csak kivételre került a kínálatból.", "success");
      } else {
        window.showToast?.("Napi menü törölve", "deleted");
      }
      closeDayMenuDeleteConfirm();
    } catch (err) {
      console.error("Heti menü törlése sikertelen:", err);
      window.showToast?.(err?.message || "Törlés sikertelen!", "error");
    }
  }

  /** Dropdown „+ Új: … hozzáadása” — közvetlen POST, modal nélkül. */
  async function createWeeklyItemInline({ category, baseId, name }) {
    const trimmed = name.trim();
    if (!trimmed) {
      window.showToast?.("Adj meg nevet az új tételhez!", "error");
      return;
    }

    try {
      const response = await menuApiRequest(`${WEEKLY_MENU_ITEMS_API}create/`, {
        method: "POST",
        body: JSON.stringify({ name: trimmed, category, is_available: true }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw err;
      }

      const saved = await response.json();
      await loadWeeklyMenuItems(true);
      window.WeeklyMenuCombobox?.setValue(baseId, saved.id, saved.name);
      window.showToast?.("Új tétel felvéve", "success");
    } catch (err) {
      console.error("Heti menü tétel létrehozása sikertelen:", err);
      const message = typeof parseApiError === "function"
        ? parseApiError(err, "Felvétel sikertelen!")
        : "Felvétel sikertelen!";
      window.showToast?.(message, "error");
    }
  }

  /** Dropdown „Kijelölt átnevezése” — közvetlen PATCH, modal nélkül. */
  async function renameWeeklyItemInline({ baseId, itemId, name }) {
    const trimmed = name.trim();
    if (!trimmed) {
      window.showToast?.("Adj meg nevet az átnevezéshez!", "error");
      return;
    }

    try {
      const response = await menuApiRequest(`${WEEKLY_MENU_ITEMS_API}${itemId}/`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw err;
      }

      const saved = await response.json();
      await loadWeeklyMenuItems(true);
      window.WeeklyMenuCombobox?.setValue(baseId, saved.id, saved.name);
      await loadWeeklyMenuFromApi();
      renderWeeklyMenuTable();
      window.showToast?.("Tétel átnevezve", "success");
    } catch (err) {
      console.error("Heti menü tétel átnevezése sikertelen:", err);
      const message = typeof parseApiError === "function"
        ? parseApiError(err, "Átnevezés sikertelen!")
        : "Átnevezés sikertelen!";
      window.showToast?.(message, "error");
    }
  }

  /**
   * Legördülő „elrejtés” gomb — soft hide a katalógusból (is_available=false).
   * A mentett heti menükben megmarad; csak a választható listából tűnik el.
   */
  async function hideWeeklyItemInline({ baseId, itemId, itemName }) {
    const label = String(itemName || "").trim() || "Tétel";

    try {
      const response = await menuApiRequest(`${WEEKLY_MENU_ITEMS_API}${itemId}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: false }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw err;
      }

      if (window.WeeklyMenuCombobox?.getValue(baseId) === itemId) {
        window.WeeklyMenuCombobox?.clearValue(baseId);
      }

      await loadWeeklyMenuItems(true);
      window.WeeklyMenuCombobox?.refreshOpenDropdown();
      window.showToast?.(`„${label}” elrejtve a listából`, "success");
    } catch (err) {
      console.error("Heti menü tétel elrejtése sikertelen:", err);
      const message = typeof parseApiError === "function"
        ? parseApiError(err, "Elrejtés sikertelen!")
        : "Elrejtés sikertelen!";
      window.showToast?.(message, "error");
    }
  }

  /* ================= KATTINTÁS-KEZELŐ (delegált) ================= */
  function handleMenuClick(e) {
    // Tab váltás
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      loadContent(tabBtn.getAttribute('data-target'));
      return;
    }

    // Napi menü szerkesztése
    const dayEditBtn = e.target.closest('.day-menu-edit-btn');
    if (dayEditBtn) {
      void openDayMenuModal(dayEditBtn.dataset.day);
      return;
    }

    // Napi menü törlése
    const dayDeleteBtn = e.target.closest('.day-menu-delete-btn');
    if (dayDeleteBtn) {
      openDayMenuDeleteConfirm(dayDeleteBtn.dataset.day);
      return;
    }

    // Napi menü modal mentés/bezárás
    if (e.target.closest('#save-day-menu')) { void saveDayMenuModal(); return; }
    if (e.target.closest('#close-day-menu-modal')) { closeDayMenuModal(); return; }
    if (e.target.id === 'day-menu-modal-overlay') { closeDayMenuModal(); return; }

    // Napi menü törlés megerősítő modal
    if (e.target.closest('#dayMenuDeleteConfirmOk')) { void confirmDayMenuDelete(); return; }
    if (e.target.closest('#dayMenuDeleteConfirmCancel')) { closeDayMenuDeleteConfirm(); return; }
    if (e.target.id === 'dayMenuDeleteConfirmModal') { closeDayMenuDeleteConfirm(); return; }

    // Új kategória hozzáadása
    if (e.target.closest('.category-add-btn')) {
      openAddCategoryModal();
      return;
    }

    // Kategória átnevezése
    const renameBtn = e.target.closest('.cat-rename-btn');
    if (renameBtn) {
      openRenameCategoryModal(renameBtn.dataset.catId);
      return;
    }

    // Kategória törlése
    const catDeleteBtn = e.target.closest('.cat-delete-btn');
    if (catDeleteBtn) {
      openCategoryDeleteConfirm(catDeleteBtn.dataset.catId);
      return;
    }

    // Kategória váltás
    const catItem = e.target.closest('.cat-item');
    if (catItem) {
      activeCategoryId = catItem.getAttribute('data-cat-id');
      renderCategorySidebar();
      refreshFoodTableArea();
      return;
    }

    // Új étel hozzáadása
    if (e.target.closest('.add-btn')) {
      openAddFoodModal();
      return;
    }

    // Étel visszaállítása elérhetőre ("Kifutott" badge)
    const availabilityBadge = e.target.closest('.food-availability-badge');
    if (availabilityBadge) {
      const food = foods.find((f) => sameId(f.id, availabilityBadge.dataset.foodId));
      if (food) {
        void (async () => {
          try {
            const response = await menuApiRequest(`${MENU_API}${food.id}/`, {
              method: "PATCH",
              body: JSON.stringify({ is_available: true }),
            });
            if (!response.ok) {
              throw new Error(await parseApiError(response, "Visszaállítás sikertelen."));
            }
            await loadFoodsFromApi();
            refreshFoodTableArea();
          } catch (err) {
            console.error(err);
            window.showToast?.(err.message || "Visszaállítás sikertelen.", "error");
          }
        })();
      }
      return;
    }

    // Étel szerkesztése
    const editBtn = e.target.closest('.menu-edit-btn');
    if (editBtn) {
      openEditFoodModal(editBtn.dataset.foodId);
      return;
    }

    // Étel törlése
    const deleteBtn = e.target.closest('.menu-delete-btn');
    if (deleteBtn) {
      openMenuDeleteConfirm(deleteBtn.dataset.foodId);
      return;
    }

    // Étel-modal mentés/bezárás
    if (e.target.closest('#save-food')) { void saveFoodModal(); return; }
    if (e.target.closest('#close-modal')) { closeFoodModal(); return; }
    if (e.target.id === 'modal-overlay') { closeFoodModal(); return; }

    // Étel törlés megerősítő modal
    if (e.target.closest('#menuDeleteConfirmOk')) { void confirmMenuDelete(); return; }
    if (e.target.closest('#menuDeleteConfirmCancel')) { closeMenuDeleteConfirm(); return; }
    if (e.target.id === 'menuDeleteConfirmModal') { closeMenuDeleteConfirm(); return; }

    // Kategória törlés megerősítő modal
    if (e.target.closest('#categoryDeleteConfirmOk')) { void confirmCategoryDelete(); return; }
    if (e.target.closest('#categoryDeleteConfirmCancel')) { closeCategoryDeleteConfirm(); return; }
    if (e.target.id === 'categoryDeleteConfirmModal') { closeCategoryDeleteConfirm(); return; }

    // Kategória modal mentés/bezárás
    if (e.target.closest('#save-category')) { void saveCategoryModal(); return; }
    if (e.target.closest('#close-category-modal')) { closeCategoryModal(); return; }
    if (e.target.id === 'category-modal-overlay') { closeCategoryModal(); return; }
  }

  /* ================= BIND EVENTS (egyszer) ================= */
  function bindEvents() {
    if (menuEventsBound) return;
    menuEventsBound = true;

    document.addEventListener('click', handleMenuClick);

    document.addEventListener("weekly-menu:add-item", (e) => {
      const { category, baseId, suggestedName } = e.detail || {};
      if (category && baseId && suggestedName) {
        void createWeeklyItemInline({ category, baseId, name: suggestedName });
      }
    });

    document.addEventListener("weekly-menu:rename-selected", (e) => {
      const { baseId, itemId, suggestedName } = e.detail || {};
      if (baseId && itemId && suggestedName) {
        void renameWeeklyItemInline({ baseId, itemId, name: suggestedName });
      }
    });

    document.addEventListener("weekly-menu:hide-item", (e) => {
      const { baseId, itemId, itemName } = e.detail || {};
      if (baseId && itemId) {
        void hideWeeklyItemInline({ baseId, itemId, itemName });
      }
    });

    document.addEventListener('input', e => {
      if (e.target.id === 'foodSearchInput') {
        foodSearchTerm = e.target.value;
        refreshFoodTableArea();
      }
    });
  }

  /* ================= PUBLIC API ================= */
  function render() {
    bindEvents();
    loadContent('heti-menu');
  }

  /**
   * Menük fül frissítése — hívók:
   *   live-sync.js → onRevisionChanged()  (másik ablak mentése után, ~2 mp)
   *   index.js refresh gomb                (kézi frissítés)
   *
   * Aktív fül szerint: loadMenuTabData() (Ételek) vagy loadWeeklyMenuFromApi() (Heti menü)
   */
  function refresh() {
    const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-target');

    if (activeTab === 'etelek') {
      loadMenuTabData(true)
        .then(() => {
          const tbody = document.querySelector('.food-table tbody');
          if (tbody && typeof fadeRender === 'function') {
            fadeRender(tbody, () => {
              renderCategorySidebar();
              refreshFoodTableArea();
            });
          } else {
            renderCategorySidebar();
            refreshFoodTableArea();
          }
        })
        .catch((err) => console.error("Ételek frissítése sikertelen:", err));
    } else if (activeTab === 'heti-menu') {
      loadWeeklyMenuFromApi()
        .then(() => {
          const tbody = document.getElementById('weeklyMenuBody');
          if (tbody && typeof fadeRender === 'function') fadeRender(tbody, renderWeeklyMenuTable);
          else renderWeeklyMenuTable();
        })
        .catch((err) => console.error("Heti menü frissítése sikertelen:", err));
    }
  }

  return { render, refresh };

})();