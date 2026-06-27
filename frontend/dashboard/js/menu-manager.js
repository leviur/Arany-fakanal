const MenuManager = (() => {

  /* ================= STATE ================= */
  let menuEventsBound = false;
  let pendingDeleteId = null;          // food.id
  let pendingCategoryDeleteId = null;  // category.id
  let pendingDayMenuDelete = null;     // day name
  let foodSearchTerm = '';

  const WEEKLY_MENU_STORAGE_KEY = 'aranyfakanal_weekly_menu';
  let weeklyMenu = {}; // { "Hétfő": { A: {leves, foetel, desszert, ar}, B: {...} }, ... }

  /* ================= KATEGÓRIÁK ================= */
  const categories = [
    { id: 'elotelek',         name: 'Előételek' },
    { id: 'levesek',          name: 'Levesek' },
    { id: 'halak-szarnyasok', name: 'Halételek és szárnyasok' },
    { id: 'rantott-toltott',  name: 'Rántott és töltött húsok' },
    { id: 'sultek',           name: 'Sültek' },
    { id: 'egytaletelek',     name: 'Egytálételek' },
    { id: 'desszertek',       name: 'Desszertek' },
    { id: 'italok',           name: 'Italok' },
  ];

  let activeCategoryId = categories[0]?.id || null;
  let categoryCounter = categories.length;

  /* ================= ALLERGÉNEK ================= */
  const ALLERGENS = [
    { key: 'gluten',   name: 'Glutén',     icon: '../images/allergens/Gluten.svg' },
    { key: 'wheat',    name: 'Búza',       icon: '../images/allergens/Wheat.svg' },
    { key: 'milk',     name: 'Tej',        icon: '../images/allergens/Milk.svg' },
    { key: 'eggs',     name: 'Tojás',      icon: '../images/allergens/Eggs.svg' },
    { key: 'fish',     name: 'Hal',        icon: '../images/allergens/Fish.svg' },
    { key: 'crab',     name: 'Rák',        icon: '../images/allergens/Crab.svg' },
    { key: 'shrimp',   name: 'Garnéla',    icon: '../images/allergens/Shrimp.svg' },
    { key: 'squid',    name: 'Tintahal',   icon: '../images/allergens/Squid.svg' },
    { key: 'abalone',  name: 'Tengeri fül', icon: '../images/allergens/Abalone.svg' },
    { key: 'beef',     name: 'Marhahús',   icon: '../images/allergens/Beef.svg' },
    { key: 'pork',     name: 'Sertés',     icon: '../images/allergens/Pork.svg' },
    { key: 'chicken',  name: 'Csirke',     icon: '../images/allergens/Chicken.svg' },
    { key: 'nuts',     name: 'Diófélék',   icon: '../images/allergens/Nuts.svg' },
    { key: 'walnut',   name: 'Dió',        icon: '../images/allergens/Walnut.svg' },
    { key: 'cashew',   name: 'Kesudió',    icon: '../images/allergens/Cashew.svg' },
    { key: 'sesame',   name: 'Szezámmag',  icon: '../images/allergens/Sesame.svg' },
    { key: 'lupine',   name: 'Csillagfürt', icon: '../images/allergens/Lupine.svg' },
    { key: 'soy',      name: 'Szója',      icon: '../images/allergens/Soy-Bean.svg' },
    { key: 'celery',   name: 'Zeller',     icon: '../images/allergens/Celery.svg' },
    { key: 'mushroom', name: 'Gomba',      icon: '../images/allergens/Mushroom.svg' },
    { key: 'matsutake', name: 'Matsutake gomba', icon: '../images/allergens/Matsuke.svg' },
    { key: 'potato',   name: 'Burgonya',   icon: '../images/allergens/Potato.svg' },
    { key: 'gelatin',  name: 'Zselatin',   icon: '../images/allergens/Gelatin.svg' },
    { key: 'sulfites', name: 'Szulfitok (kén-dioxid)', icon: '../images/allergens/Sulfites.svg' },
    { key: 'apple',    name: 'Alma',       icon: '../images/allergens/Apple.svg' },
    { key: 'banana',   name: 'Banán',      icon: '../images/allergens/Banana.svg' },
    { key: 'orange',   name: 'Narancs',    icon: '../images/allergens/Orange.svg' },
    { key: 'peach',    name: 'Őszibarack', icon: '../images/allergens/Peach.svg' },
    { key: 'kiwi',     name: 'Kiwi',       icon: '../images/allergens/Kiwi.svg' },
  ];

  /* ================= DEMO ÉTELADATOK (flat array, stabil id-kkel) ================= */
  const foods = [
    { id: 'food-001', categoryId: 'elotelek', nev: "Kézműves krémvariációk friss kenyérrel", ar: "2690 Ft", leiras: "Mangalica tepertőkrém, fűszeres körözött és padlizsánkrém házi kovászos kenyérrel és friss kerti zöldségekkel.", available: true, allergens: ['gluten', 'wheat', 'milk'] },
    { id: 'food-002', categoryId: 'elotelek', nev: "Érlelt bélszíntatár a kert legjavával", ar: "3990 Ft", leiras: "Hagyományos recept alapján fűszerezett, selymes textúrájú marhabélszín, friss idényzöldségekkel, vajjal/kacsazsírral és ropogós házi kovászos kenyérrel.", available: true, allergens: ['beef', 'gluten', 'wheat', 'milk'] },
    { id: 'food-003', categoryId: 'elotelek', nev: "Kemencés velős csont lilahagyma-lekvárral", ar: "3190 Ft", leiras: "Fűszeres velős csont, házi készítésű, édeskés-savanykás lilahagyma-lekvárral és ropogós házi kovászos kenyérrel.", available: true, allergens: ['gluten', 'wheat'] },
    { id: 'food-004', categoryId: 'elotelek', nev: "A kamra kincsei", ar: "4490 Ft", leiras: "Füstölt kolbász, pikáns paprikás szalámi, omlós sonka, érlelt és füstölt sajtok, savanyúság és kovászos kenyér.", available: true, allergens: ['pork', 'milk', 'gluten', 'wheat'] },

    { id: 'food-005', categoryId: 'levesek', nev: "Gulyásleves", ar: "3490 Ft", leiras: "Omlós marhahúsból, lassú tűzön főzött gazdag gulyásleves csipetkével.", available: true, allergens: ['beef', 'gluten', 'eggs'] },
    { id: 'food-006', categoryId: 'levesek', nev: "Füstölt csülkös Jókai bableves", ar: "3190 Ft", leiras: "Tartalmas bableves füstölt csülökkel és házi kolbásszal, tejföllel és petrezselyemmel.", available: true, allergens: ['pork', 'milk'] },
    { id: 'food-007', categoryId: 'levesek', nev: "Marhahúsleves gazdagon", ar: "2790 Ft", leiras: "Kristálytiszta, hosszú főzésű húsleves marhafartővel és házi tésztával.", available: true, allergens: ['beef', 'gluten', 'wheat'] },
    { id: 'food-008', categoryId: 'levesek', nev: "Tavaszi zöldborsóleves vajas galuskával", ar: "2790 Ft", leiras: "Könnyed zöldborsóleves vajas galuskával.", available: true, allergens: ['gluten', 'eggs', 'milk'] },
    { id: 'food-009', categoryId: 'levesek', nev: "Szegedi halászlé szaftos pontyfilével", ar: "3490 Ft", leiras: "Intenzív halászlé pontyfilével és friss kenyérrel.", available: true, allergens: ['fish', 'gluten', 'wheat'] },

    { id: 'food-010', categoryId: 'halak-szarnyasok', nev: "Mandulás bundában sült fogasfilé", ar: "4890 Ft", leiras: "Ropogós mandulás bundában sült fogasfilé majonézes burgonyasalátával.", available: true, allergens: ['fish', 'nuts', 'milk', 'eggs', 'potato', 'gluten', 'wheat'] },
    { id: 'food-011', categoryId: 'halak-szarnyasok', nev: "Harcsapaprikás túrós csuszával", ar: "5890 Ft", leiras: "Szaftos harcsapaprikás túrós csuszával.", available: true, allergens: ['fish', 'milk', 'gluten', 'wheat'] },
    { id: 'food-012', categoryId: 'halak-szarnyasok', nev: "Tanyasi paprikás csirke vajas galuskával", ar: "5490 Ft", leiras: "Tejfölös paprikás csirke vajas galuskával.", available: true, allergens: ['chicken', 'milk', 'gluten', 'eggs'] },
    { id: 'food-013', categoryId: 'halak-szarnyasok', nev: "Mátrai borzas csirkemell", ar: "5690 Ft", leiras: "Ropogós csirkemell fokhagymás bundában, füstölt sajttal.", available: true, allergens: ['chicken', 'milk', 'potato', 'gluten', 'wheat', 'eggs'] },

    { id: 'food-014', categoryId: 'rantott-toltott', nev: "Klasszikus rántott szelet", ar: "5690 Ft", leiras: "Aranybarna panko bundás rántott szelet vajas burgonyával.", available: true, allergens: ['pork', 'gluten', 'wheat', 'eggs', 'milk', 'potato'] },
    { id: 'food-015', categoryId: 'rantott-toltott', nev: "Pásztorok kedvence karaj rántva", ar: "5890 Ft", leiras: "Töltött karaj kolbásszal és juhtúróval, burgonyapürével.", available: true, allergens: ['pork', 'milk', 'potato', 'gluten', 'wheat', 'eggs'] },

    { id: 'food-016', categoryId: 'sultek', nev: "Marhapörkölt galuskával", ar: "5890 Ft", leiras: "Omlós marhalábszárból, sűrű szafttal, vörösborral és fűszerpaprikával lassan főzött pörkölt, tojásos házi galuskával és kovászos uborkával.", available: true, allergens: ['beef', 'gluten', 'eggs'] },
    { id: 'food-017', categoryId: 'sultek', nev: "Cigánypecsenye kakastaréjjal", ar: "5890 Ft", leiras: "Fokhagymás pácban érlelt sertéstarja ropogós szalonnataréjjal, házi rósejbnivel.", available: true, allergens: ['pork', 'potato'] },
    { id: 'food-018', categoryId: 'sultek', nev: "Kemencés csülök Pékné módra", ar: "6590 Ft", leiras: "Kívül ropogós, belül omlós csülök, hagymás-fokhagymás kemencés burgonyával.", available: true, allergens: ['pork', 'potato'] },

    { id: 'food-019', categoryId: 'egytaletelek', nev: "Kolozsvári töltött káposzta", ar: "5690 Ft", leiras: "Savanyú káposzta ágyon, füstölt csülökkel és házi kolbásszal lassan összefőzött szaftos töltelékek, tejföllel és friss kenyérrel.", available: true, allergens: ['pork'] },
    { id: 'food-020', categoryId: 'egytaletelek', nev: "Házi töltött paprika és paradicsomos húsgombóc", ar: "5390 Ft", leiras: "Fűszeres húsos rizzsel töltött paprika és omlós húsgombócok selymes paradicsommártásban, főtt burgonyával.", available: true, allergens: ['beef', 'pork'] },

    { id: 'food-021', categoryId: 'desszertek', nev: "Somlói galuska", ar: "2590 Ft", leiras: "Diós, vaníliás és kakaós piskóta rétegek rumos mazsolával és csokoládéöntettel.", available: true, allergens: ['walnut', 'nuts', 'milk', 'eggs', 'gluten', 'wheat'] },
    { id: 'food-022', categoryId: 'desszertek', nev: "Pillekönnyű túrógombóc édes tejföllel", ar: "2150 Ft", leiras: "Túrógombóc pirított morzsában, vaníliás tejföllel.", available: true, allergens: ['milk', 'eggs', 'gluten', 'wheat'] },
    { id: 'food-023', categoryId: 'desszertek', nev: "Rákóczi túrós", ar: "2790 Ft", leiras: "Omlós tészta, citromos túrókrém és tojáshab baracklekvárral.", available: true, allergens: ['milk', 'eggs', 'gluten', 'wheat'] },
    { id: 'food-024', categoryId: 'desszertek', nev: "Aranygaluska selymes vaníliasodóval", ar: "2790 Ft", leiras: "Foszlós kelt tészta dióval és vaníliasodóval.", available: true, allergens: ['walnut', 'nuts', 'milk', 'eggs', 'gluten', 'wheat'] },
    { id: 'food-025', categoryId: 'desszertek', nev: "Mákos guba vaníliaöntettel", ar: "2190 Ft", leiras: "Kifli, mák és vaníliás öntet, sütve.", available: true, allergens: ['milk', 'gluten', 'wheat'] },

    { id: 'food-026', categoryId: 'italok', nev: "Meggypálinka", ar: "2190 Ft", leiras: "", available: true, allergens: [] },
    { id: 'food-027', categoryId: 'italok', nev: "Szilvapálinka", ar: "2490 Ft", leiras: "", available: true, allergens: [] },
    { id: 'food-028', categoryId: 'italok', nev: "Kajszibarack Pálinka", ar: "3690 Ft", leiras: "", available: true, allergens: ['peach'] },
    { id: 'food-029', categoryId: 'italok', nev: "Villányi Portugieser", ar: "6890 Ft", leiras: "", available: true, allergens: ['sulfites'] },
    { id: 'food-030', categoryId: 'italok', nev: "Tokaji Furmint", ar: "9990 Ft", leiras: "", available: true, allergens: ['sulfites'] },
    { id: 'food-031', categoryId: 'italok', nev: "Tokaji Aszú 5 Puttonyos", ar: "13890 Ft", leiras: "", available: true, allergens: ['sulfites'] },
    { id: 'food-032', categoryId: 'italok', nev: "Soproni", ar: "1090 Ft", leiras: "", available: true, allergens: ['gluten'] },
    { id: 'food-033', categoryId: 'italok', nev: "Pilsner Urquell", ar: "1190 Ft", leiras: "", available: true, allergens: ['gluten'] },
    { id: 'food-034', categoryId: 'italok', nev: "Dreher Bak (Barna sör)", ar: "1390 Ft", leiras: "", available: true, allergens: ['gluten'] },
    { id: 'food-035', categoryId: 'italok', nev: "Házi Limonádé szódával", ar: "1190 Ft", leiras: "", available: true, allergens: [] },
  ];

  let nextFoodId = foods.length;

  const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];

  /* ================= SEGÉDFÜGGVÉNYEK ================= */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function foodsByCategory(catId) {
    return foods.filter(f => f.categoryId === catId);
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
    ul.innerHTML = categories.map(cat => categoryListItemHtml(cat, cat.id === activeCategoryId)).join('');
  }

  function refreshFoodTableArea() {
    const category = categories.find(c => c.id === activeCategoryId);
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
      loadWeeklyMenu();
      renderWeeklyMenuTable();
    }
    if (target === 'etelek') {
      foodSearchTerm = '';
      if (!categories.some(c => c.id === activeCategoryId)) {
        activeCategoryId = categories[0]?.id || null;
      }
      renderCategorySidebar();
      refreshFoodTableArea();
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
    const category = categories.find(c => c.id === activeCategoryId);
    document.getElementById('modal-cat-name').textContent = category?.name || '';
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function openEditFoodModal(foodId) {
    const modal = document.getElementById('modal-overlay');
    const item = foods.find(f => f.id === foodId);
    if (!item) return;

    document.getElementById('foodModalTitle').textContent = 'Étel szerkesztése';
    const category = categories.find(c => c.id === item.categoryId);
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

  function saveFoodModal() {
    const modal = document.getElementById('modal-overlay');
    const nameInput = document.getElementById('food-name');
    const priceInput = document.getElementById('food-price');
    const descInput = document.getElementById('food-desc');
    const availableInput = document.getElementById('food-available');

    if (!nameInput.value.trim() || !priceInput.value.trim() || !descInput.value.trim()) {
      window.showToast?.('Kérlek, minden mezőt tölts ki!', 'error');
      return;
    }

    const mode = modal.dataset.mode;
    const foodFields = {
      nev: nameInput.value,
      ar: priceInput.value + ' Ft',
      leiras: descInput.value,
      available: availableInput.checked,
      allergens: getCheckedAllergens(),
    };

    if (mode === 'edit') {
      const existing = foods.find(f => f.id === modal.dataset.foodId);
      if (!existing) return;
      Object.assign(existing, foodFields);
      activeCategoryId = existing.categoryId;
    } else {
      nextFoodId += 1;
      foods.push({ id: `food-${String(nextFoodId).padStart(3, '0')}`, categoryId: activeCategoryId, ...foodFields });
    }

    refreshFoodTableArea();
    closeFoodModal();
    window.showToast?.(mode === 'edit' ? 'Étel mentve' : 'Étel hozzáadva', 'success');
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

  function confirmMenuDelete() {
    if (!pendingDeleteId) return;
    const idx = foods.findIndex(f => f.id === pendingDeleteId);
    if (idx === -1) { closeMenuDeleteConfirm(); return; }

    foods.splice(idx, 1);
    refreshFoodTableArea();
    closeMenuDeleteConfirm();
    window.showToast?.('Étel törölve', 'deleted');
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
    const category = categories.find(c => c.id === catId);
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

  function saveCategoryModal() {
    const modal = document.getElementById('category-modal-overlay');
    const nameInput = document.getElementById('category-name');
    const name = nameInput.value.trim();

    if (!name) {
      window.showToast?.('Kérlek, adj nevet a kategóriának!', 'error');
      return;
    }

    const mode = modal.dataset.mode;

    if (mode === 'rename') {
      const category = categories.find(c => c.id === modal.dataset.catId);
      if (!category) return;
      category.name = name;
      if (activeCategoryId === category.id) refreshFoodTableArea();
    } else {
      categoryCounter += 1;
      const newCategory = { id: `cat-${categoryCounter}`, name };
      categories.push(newCategory);
      activeCategoryId = newCategory.id;
      refreshFoodTableArea();
    }

    renderCategorySidebar();
    closeCategoryModal();
    window.showToast?.(mode === 'rename' ? 'Kategória átnevezve' : 'Kategória hozzáadva', 'success');
  }

  /* ================= KATEGÓRIA TÖRLÉS MEGERŐSÍTŐ MODAL ================= */
  function openCategoryDeleteConfirm(catId) {
    const category = categories.find(c => c.id === catId);
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

  function confirmCategoryDelete() {
    if (!pendingCategoryDeleteId) return;
    const catId = pendingCategoryDeleteId;

    for (let i = foods.length - 1; i >= 0; i--) {
      if (foods[i].categoryId === catId) foods.splice(i, 1);
    }

    const idx = categories.findIndex(c => c.id === catId);
    if (idx !== -1) categories.splice(idx, 1);

    if (activeCategoryId === catId) {
      activeCategoryId = categories[0]?.id || null;
    }

    renderCategorySidebar();
    refreshFoodTableArea();
    closeCategoryDeleteConfirm();
    window.showToast?.('Kategória törölve', 'deleted');
  }

  /* ================= HETI MENÜ MENTÉS ================= */
  function loadWeeklyMenu() {
    try {
      weeklyMenu = JSON.parse(localStorage.getItem(WEEKLY_MENU_STORAGE_KEY) || '{}');
    } catch {
      weeklyMenu = {};
    }
  }

  function saveWeeklyMenuToStorage() {
    localStorage.setItem(WEEKLY_MENU_STORAGE_KEY, JSON.stringify(weeklyMenu));
  }

  /* ================= NAPI MENÜ MODAL (hozzáadás/szerkesztés) ================= */
  function openDayMenuModal(day) {
    const modal = document.getElementById('day-menu-modal-overlay');
    const entry = weeklyMenu[day] || {};
    const a = entry.A || {};
    const b = entry.B || {};

    document.getElementById('dayMenuModalTitle').textContent = `${day} menüje`;
    document.getElementById('day-a-leves').value = a.leves || '';
    document.getElementById('day-a-foetel').value = a.foetel || '';
    document.getElementById('day-a-desszert').value = a.desszert || '';
    document.getElementById('day-a-ar').value = a.ar ? parseInt(a.ar) : '';
    document.getElementById('day-b-leves').value = b.leves || '';
    document.getElementById('day-b-foetel').value = b.foetel || '';
    document.getElementById('day-b-desszert').value = b.desszert || '';
    document.getElementById('day-b-ar').value = b.ar ? parseInt(b.ar) : '';

    modal.dataset.day = day;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeDayMenuModal() {
    const modal = document.getElementById('day-menu-modal-overlay');
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 150);
  }

  function saveDayMenuModal() {
    const modal = document.getElementById('day-menu-modal-overlay');
    const day = modal.dataset.day;
    if (!day) return;

    const fieldIds = [
      'day-a-leves', 'day-a-foetel', 'day-a-desszert', 'day-a-ar',
      'day-b-leves', 'day-b-foetel', 'day-b-desszert', 'day-b-ar',
    ];
    const values = {};
    let hasEmpty = false;
    fieldIds.forEach(id => {
      const value = document.getElementById(id).value.trim();
      values[id] = value;
      if (!value) hasEmpty = true;
    });

    if (hasEmpty) {
      window.showToast?.('Kérlek, minden mezőt tölts ki!', 'error');
      return;
    }

    weeklyMenu[day] = {
      A: { leves: values['day-a-leves'], foetel: values['day-a-foetel'], desszert: values['day-a-desszert'], ar: values['day-a-ar'] + ' Ft' },
      B: { leves: values['day-b-leves'], foetel: values['day-b-foetel'], desszert: values['day-b-desszert'], ar: values['day-b-ar'] + ' Ft' },
    };

    saveWeeklyMenuToStorage();
    renderWeeklyMenuTable();
    closeDayMenuModal();
    window.showToast?.('Heti menü mentve', 'success');
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

  function confirmDayMenuDelete() {
    if (!pendingDayMenuDelete) return;
    delete weeklyMenu[pendingDayMenuDelete];

    saveWeeklyMenuToStorage();
    renderWeeklyMenuTable();
    closeDayMenuDeleteConfirm();
    window.showToast?.('Napi menü törölve', 'deleted');
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
      openDayMenuModal(dayEditBtn.dataset.day);
      return;
    }

    // Napi menü törlése
    const dayDeleteBtn = e.target.closest('.day-menu-delete-btn');
    if (dayDeleteBtn) {
      openDayMenuDeleteConfirm(dayDeleteBtn.dataset.day);
      return;
    }

    // Napi menü modal mentés/bezárás
    if (e.target.closest('#save-day-menu')) { saveDayMenuModal(); return; }
    if (e.target.closest('#close-day-menu-modal')) { closeDayMenuModal(); return; }
    if (e.target.id === 'day-menu-modal-overlay') { closeDayMenuModal(); return; }

    // Napi menü törlés megerősítő modal
    if (e.target.closest('#dayMenuDeleteConfirmOk')) { confirmDayMenuDelete(); return; }
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
      const food = foods.find(f => f.id === availabilityBadge.dataset.foodId);
      if (food) {
        food.available = true;
        refreshFoodTableArea();
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
    if (e.target.closest('#save-food')) { saveFoodModal(); return; }
    if (e.target.closest('#close-modal')) { closeFoodModal(); return; }
    if (e.target.id === 'modal-overlay') { closeFoodModal(); return; }

    // Étel törlés megerősítő modal
    if (e.target.closest('#menuDeleteConfirmOk')) { confirmMenuDelete(); return; }
    if (e.target.closest('#menuDeleteConfirmCancel')) { closeMenuDeleteConfirm(); return; }
    if (e.target.id === 'menuDeleteConfirmModal') { closeMenuDeleteConfirm(); return; }

    // Kategória törlés megerősítő modal
    if (e.target.closest('#categoryDeleteConfirmOk')) { confirmCategoryDelete(); return; }
    if (e.target.closest('#categoryDeleteConfirmCancel')) { closeCategoryDeleteConfirm(); return; }
    if (e.target.id === 'categoryDeleteConfirmModal') { closeCategoryDeleteConfirm(); return; }

    // Kategória modal mentés/bezárás
    if (e.target.closest('#save-category')) { saveCategoryModal(); return; }
    if (e.target.closest('#close-category-modal')) { closeCategoryModal(); return; }
    if (e.target.id === 'category-modal-overlay') { closeCategoryModal(); return; }
  }

  /* ================= BIND EVENTS (egyszer) ================= */
  function bindEvents() {
    if (menuEventsBound) return;
    menuEventsBound = true;

    document.addEventListener('click', handleMenuClick);

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

  function refresh() {
    const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-target');

    if (activeTab === 'etelek') {
      const tbody = document.querySelector('.food-table tbody');
      if (tbody && typeof fadeRender === 'function') fadeRender(tbody, refreshFoodTableArea);
      else refreshFoodTableArea();
    } else if (activeTab === 'heti-menu') {
      const tbody = document.getElementById('weeklyMenuBody');
      if (tbody && typeof fadeRender === 'function') fadeRender(tbody, renderWeeklyMenuTable);
      else renderWeeklyMenuTable();
    }
  }

  return { render, refresh };

})();
