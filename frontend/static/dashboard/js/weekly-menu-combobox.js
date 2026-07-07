/**

 * Kereshető legördülő — WeeklyMenuItem választó (dashboard heti menü), nem közvetlenül az adatbázisból nyeri az adatokat.

 * - A tételek listáját a menu-manager.js tölti be (GET /api/weekly-menu-items/)  és adja át a setItems() hívással.

 * - A kiválasztott tétel *id*-ja egy rejtett <input>-ben tárolódik.

 * - Mentéskor a menu-manager.js ezt az id-t küldi a backendnek (FK).

 *

 * Megjelenített név (szövegmező) ≠ adatbázis kulcs; mentéskor mindig az id számít.

 */

const WeeklyMenuCombobox = (() => {

  // A GET /api/weekly-menu-items/ válaszából jön; csak böngésző memória

  let allItems = [];

  let activeDropdown = null;

  let bound = false;



  // category mező értékei az adatbázisban (WeeklyMenuItem.category)

  const CATEGORY_LABELS = {

    soup: "Leves",
    main: "Főétel",
    dessert: "Desszert",
  };



  function escapeHtml(str) {

    return String(str).replace(/[&<>"']/g, (c) => ({

      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",

    }[c]));

  }



  function getFieldIds(baseId) {

    return {

      input: `${baseId}-input`,      // látható név (kereséshez)

      hidden: `${baseId}-id`,        // WeeklyMenuItem.id → ezt menti a backend

      dropdown: `${baseId}-dropdown`,

    };

  }



  /** menu-manager hívja API betöltés után */

  function setItems(items) {

    allItems = Array.isArray(items) ? items : [];

  }



  function itemsForCategory(category) {

    return allItems.filter((item) => item.category === category && item.is_available !== false);

  }



  function filterItems(category, term) {

    const normalized = term.trim().toLowerCase();
    const list = itemsForCategory(category);
    if (!normalized) return list;
    return list.filter((item) => item.name.toLowerCase().includes(normalized));

  }



  function closeDropdown(dropdown) {

    if (!dropdown) return;

    dropdown.classList.add("hidden");

    if (activeDropdown === dropdown) activeDropdown = null;

  }



  function openCombobox(baseId, category) {

    const combobox = document.getElementById(`${baseId}-input`)?.closest(".wm-combobox");

    combobox?.classList.add("is-open");

    // Megnyitáskor teljes lista (nem szűrünk a mezőben lévő névre)

    renderDropdown(baseId, category, "");

  }



  function closeCombobox(baseId) {

    const combobox = document.getElementById(`${baseId}-input`)?.closest(".wm-combobox");

    combobox?.classList.remove("is-open");

    const { dropdown } = getFieldIds(baseId);

    closeDropdown(document.getElementById(dropdown));

  }



  function closeAllComboboxes() {

    document.querySelectorAll(".wm-combobox.is-open").forEach((el) => {

      const input = el.querySelector(".wm-combobox-input");

      if (input) {

        closeCombobox(input.id.replace(/-input$/, ""));

      }

    });

  }



  function renderDropdown(baseId, category, term) {

    const { dropdown } = getFieldIds(baseId);

    const listEl = document.getElementById(dropdown);

    if (!listEl) return;



    const matches = filterItems(category, term).slice(0, 50);

    if (!matches.length) {

      listEl.innerHTML = `<li class="wm-combobox-empty">Nincs találat</li>`;

    } else {

      listEl.innerHTML = matches.map((item) =>
         `

            <li>

              <button type="button" class="wm-combobox-option" data-base-id="${baseId}" data-item-id="${item.id}">

                ${escapeHtml(item.name)}

              </button>

            </li>
          `,

        )

        .join("");

    }

    listEl.classList.remove("hidden");

    activeDropdown = listEl;

  }



  function closeAllDropdowns() {

    closeAllComboboxes();

  }



  /** Szerkesztő megnyitásakor: név a látható mezőbe, id a rejtett mezőbe */
  function setValue(baseId, itemId, itemName) {
    const { input, hidden } = getFieldIds(baseId);
    const inputEl = document.getElementById(input);
    const hiddenEl = document.getElementById(hidden);
    if (inputEl) inputEl.value = itemName || "";
    if (hiddenEl) hiddenEl.value = itemId ? String(itemId) : "";
    updateItemActions(baseId);
  }

  /**
   * „Szerkesztés” / „Törlés” gombok: csak akkor látszanak, ha van kiválasztott
   * WeeklyMenuItem id a rejtett mezőben (listából választott tétel).
   */
  function updateItemActions(baseId) {
    const actions = document.getElementById(`${baseId}-actions`);
    if (!actions) return;
    if (getValue(baseId)) {
      actions.classList.remove("hidden");
    } else {
      actions.classList.add("hidden");
    }
  }



  /** Mentéskor a menu-manager ebből olvassa ki a WeeklyMenuItem.id-t */

  function getValue(baseId) {

    const { hidden } = getFieldIds(baseId);

    const hiddenEl = document.getElementById(hidden);

    const value = hiddenEl?.value?.trim();

    return value ? Number(value) : null;

  }



  function getLabel(baseId) {

    const { input } = getFieldIds(baseId);

    return document.getElementById(input)?.value?.trim() || "";

  }



  function clearValue(baseId) {

    setValue(baseId, null, "");

  }



  function bindEvents() {

    if (bound) return;

    bound = true;



    document.addEventListener("input", (e) => {

      const input = e.target.closest(".wm-combobox-input");

      if (!input) return;

      const baseId = input.id.replace(/-input$/, "");

      const category = input.closest(".wm-combobox")?.dataset.category;

      if (!category) return;



      const { hidden } = getFieldIds(baseId);

      const hiddenEl = document.getElementById(hidden);

      // Felhasználó gépel → régi kiválasztás érvénytelen, amíg újat nem választ

      if (hiddenEl) hiddenEl.value = "";

      updateItemActions(baseId);

      input.closest(".wm-combobox")?.classList.add("is-open");

      renderDropdown(baseId, category, input.value);

    });



    document.addEventListener("focusin", (e) => {

      const input = e.target.closest(".wm-combobox-input");

      if (!input) return;

      const baseId = input.id.replace(/-input$/, "");

      const category = input.closest(".wm-combobox")?.dataset.category;

      if (!category) return;

      closeAllComboboxes();

      openCombobox(baseId, category);

    });



    document.addEventListener("mousedown", (e) => {

      const input = e.target.closest(".wm-combobox-input");

      if (!input) return;

      const baseId = input.id.replace(/-input$/, "");

      const category = input.closest(".wm-combobox")?.dataset.category;

      if (!category) return;

      closeAllComboboxes();

      openCombobox(baseId, category);

    });



    document.addEventListener("click", (e) => {

      const option = e.target.closest(".wm-combobox-option");

      if (option) {

        const itemId = Number(option.dataset.itemId);

        const item = allItems.find((entry) => entry.id === itemId);

        if (item) {

          setValue(option.dataset.baseId, item.id, item.name);

        }

        closeCombobox(option.dataset.baseId);

        return;

      }

      // Kiválasztott tétel átnevezése (PATCH) — menu-manager.js nyitja a modalt
      if (e.target.closest(".wm-combobox-edit-btn")) {
        const btn = e.target.closest(".wm-combobox-edit-btn");
        const baseId = btn.dataset.baseId;
        const itemId = getValue(baseId);
        if (!itemId) return;
        const combobox = btn.closest(".wm-combobox");
        document.dispatchEvent(
          new CustomEvent("weekly-menu:edit-item", {
            detail: {
              baseId,
              itemId,
              name: getLabel(baseId),
              category: combobox?.dataset.category,
            },
          }),
        );
        return;
      }

      // Árva tétel törlése (DELETE) — menu-manager.js megerősítő modal
      if (e.target.closest(".wm-combobox-delete-btn")) {
        const btn = e.target.closest(".wm-combobox-delete-btn");
        const baseId = btn.dataset.baseId;
        const itemId = getValue(baseId);
        if (!itemId) return;
        document.dispatchEvent(
          new CustomEvent("weekly-menu:delete-item", {
            detail: { baseId, itemId, name: getLabel(baseId) },
          }),
        );
        return;
      }

      // „+ Új tétel” → menu-manager.js nyitja a modalt és POST-olja a tételt

      if (e.target.closest(".wm-combobox-new-btn")) {

        const btn = e.target.closest(".wm-combobox-new-btn");

        const category = btn.dataset.category;

        const baseId = btn.dataset.baseId;

        closeAllDropdowns();

        document.dispatchEvent(

          new CustomEvent("weekly-menu:add-item", { detail: { category, baseId } }),

        );

        return;

      }



      if (!e.target.closest(".wm-combobox")) {

        closeAllComboboxes();

      }

    });



    document.addEventListener("keydown", (e) => {

      if (e.key === "Escape") closeAllComboboxes();

    });

  }



  function init() {

    bindEvents();

  }



  return {

    init,

    setItems,

    setValue,

    getValue,

    getLabel,

    clearValue,
    updateItemActions,
    CATEGORY_LABELS,

  };

})();



window.WeeklyMenuCombobox = WeeklyMenuCombobox;



document.addEventListener("DOMContentLoaded", () => WeeklyMenuCombobox.init());


