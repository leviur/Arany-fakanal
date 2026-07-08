/**
 * Kereshető legördülő — WeeklyMenuItem választó (dashboard heti menü).
 *
 * UX (chip + átnevezett műveletek):
 *   - Kiválasztott tétel → chip jelenik meg (név + átnevezés + leválasztás)
 *   - Gépelés → kereső mód, legördülő akciók:
 *       • „Új felvétele: …”  — katalógusba új név
 *       • „Átnevezés erre: …” — meglévő tétel átnevezése (PATCH)
 *   - „Leválasztás” (×) csak a mezőt üríti, nem törli a katalógust
 *   - Legördülő sor mellett „elrejtés” (👁‍🗨) → PATCH is_available=false
 *
 * Adatfolyam:
 *   menu-manager.js tölti a listát (GET /api/weekly-menu-items/) → setItems()
 *   Mentéskor a rejtett *-id megy a backendnek (FK).
 */

const WeeklyMenuCombobox = (() => {
  let allItems = [];
  let activeDropdown = null;
  let bound = false;
  /** Nyitott legördülő állapota — elrejtés után újrarajzoláshoz */
  let lastDropdownContext = null;

  /** Utolsó listából választott tétel — átnevezéshez, ha a user gépel közben */
  const selectedSnapshotByBaseId = new Map();

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
      input: `${baseId}-input`,
      hidden: `${baseId}-id`,
      dropdown: `${baseId}-dropdown`,
      chip: `${baseId}-chip`,
      chipLabel: `${baseId}-chip-label`,
    };
  }

  function getComboboxEl(baseId) {
    return document.getElementById(`${baseId}-input`)?.closest(".wm-combobox");
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
    if (activeDropdown === dropdown) {
      activeDropdown = null;
      lastDropdownContext = null;
    }
  }

  function closeCombobox(baseId) {
    restoreSelectionIfPending(baseId);
    getComboboxEl(baseId)?.classList.remove("is-open");
    const { dropdown } = getFieldIds(baseId);
    closeDropdown(document.getElementById(dropdown));
  }

  /**
   * Átnevezés / kereső mód megszakítása: ha van mentett snapshot, de nincs id,
   * visszaállítjuk a chipet (ceruza + ×) az eredeti kiválasztással.
   */
  function restoreSelectionIfPending(baseId) {
    const snapshot = selectedSnapshotByBaseId.get(baseId);
    const { hidden, input } = getFieldIds(baseId);
    const hiddenEl = document.getElementById(hidden);
    const inputEl = document.getElementById(input);

    if (!snapshot?.id || hiddenEl?.value?.trim()) return;

    hiddenEl.value = String(snapshot.id);
    if (inputEl) inputEl.value = snapshot.name || "";
    updateViewMode(baseId);
  }

  function closeAllComboboxes() {
    document.querySelectorAll(".wm-combobox.is-open").forEach((el) => {
      const input = el.querySelector(".wm-combobox-input");
      if (input) closeCombobox(input.id.replace(/-input$/, ""));
    });
  }

  /**
   * Chip mód: van kiválasztott id → chip látszik, input rejtve.
   * Kereső mód: nincs kiválasztás → input látszik, chip rejtve.
   */
  function updateViewMode(baseId) {
    const { input, chip, chipLabel, hidden } = getFieldIds(baseId);
    const inputEl = document.getElementById(input);
    const chipEl = document.getElementById(chip);
    const labelEl = document.getElementById(chipLabel);
    const hiddenEl = document.getElementById(hidden);
    const itemId = hiddenEl?.value?.trim();

    if (!inputEl || !chipEl) return;

    if (itemId) {
      const snapshot = selectedSnapshotByBaseId.get(baseId);
      const name = snapshot?.name || inputEl.value || "";
      if (labelEl) {
        labelEl.textContent = name;
        labelEl.title = name;
      }
      chipEl.title = name;
      chipEl.classList.remove("hidden");
      inputEl.classList.add("wm-combobox-input-hidden");
    } else {
      if (labelEl) labelEl.title = "";
      chipEl.title = "";
      chipEl.classList.add("hidden");
      inputEl.classList.remove("wm-combobox-input-hidden");
    }
  }

  /** Chip „átnevezés” (✎) → kereső mód, név előtöltve; snapshot megmarad az átnevezéshez */
  function enterSearchMode(baseId, prefill = "") {
    const { input, hidden, chip } = getFieldIds(baseId);
    const inputEl = document.getElementById(input);
    const hiddenEl = document.getElementById(hidden);
    const chipEl = document.getElementById(chip);
    const category = getComboboxEl(baseId)?.dataset.category;

    if (!inputEl || !category) return;

    if (chipEl) chipEl.classList.add("hidden");
    inputEl.classList.remove("wm-combobox-input-hidden");
    if (hiddenEl) hiddenEl.value = "";
    inputEl.value = prefill;

    closeAllComboboxes();
    getComboboxEl(baseId)?.classList.add("is-open");
    renderDropdown(baseId, category, prefill);
    inputEl.focus();
  }

  function renderDropdown(baseId, category, term) {
    const { dropdown } = getFieldIds(baseId);
    const listEl = document.getElementById(dropdown);
    if (!listEl) return;

    const matches = filterItems(category, term).slice(0, 50);
    const normalizedTerm = term.trim();
    const loweredTerm = normalizedTerm.toLowerCase();
    const hasExactMatch = !!(
      loweredTerm
      && itemsForCategory(category).some(
        (item) => String(item.name || "").trim().toLowerCase() === loweredTerm,
      )
    );

    // Átnevezett akciók (6-os javaslat) — egyértelműbb, mint „Törlés” / „Szerkesztés”
    const createRow = normalizedTerm && !hasExactMatch
      ? `
        <li>
          <button
            type="button"
            class="wm-combobox-action-option wm-combobox-create-option"
            data-base-id="${baseId}"
            data-category="${category}"
            data-name="${escapeHtml(normalizedTerm)}"
          >
            Új felvétele: „${escapeHtml(normalizedTerm)}”
          </button>
        </li>
      `
      : "";

    const selectedSnapshot = selectedSnapshotByBaseId.get(baseId) || null;
    const selectedName = String(selectedSnapshot?.name || "").trim();
    const renameRow = selectedSnapshot?.id && normalizedTerm && selectedName.toLowerCase() !== loweredTerm
      ? `
        <li>
          <button
            type="button"
            class="wm-combobox-action-option wm-combobox-rename-option"
            data-base-id="${baseId}"
            data-category="${category}"
            data-item-id="${selectedSnapshot.id}"
            data-current-name="${escapeHtml(selectedName)}"
            data-name="${escapeHtml(normalizedTerm)}"
          >
            Átnevezés erre: „${escapeHtml(normalizedTerm)}”
          </button>
        </li>
      `
      : "";

    if (!matches.length) {
      listEl.innerHTML = `<li class="wm-combobox-empty">Nincs találat</li>${renameRow}${createRow}`;
    } else {
      listEl.innerHTML = matches.map((item) => `
        <li class="wm-combobox-option-row">
          <button
            type="button"
            class="wm-combobox-option"
            data-base-id="${baseId}"
            data-item-id="${item.id}"
          >
            ${escapeHtml(item.name)}
          </button>
          <button
            type="button"
            class="wm-combobox-hide-btn"
            data-base-id="${baseId}"
            data-item-id="${item.id}"
            data-item-name="${escapeHtml(item.name)}"
            aria-label="Elrejtés a listából"
            title="Elrejtés a listából"
          >
            <i class="fa-solid fa-eye-slash" aria-hidden="true"></i>
          </button>
        </li>
      `).join("");
      listEl.innerHTML += renameRow;
      listEl.innerHTML += createRow;
    }

    lastDropdownContext = { baseId, category, term };

    listEl.classList.remove("hidden");
    activeDropdown = listEl;
  }

  function openCombobox(baseId, category) {
    getComboboxEl(baseId)?.classList.add("is-open");
    renderDropdown(baseId, category, "");
  }

  /** API frissítés után: nyitott legördülő újrarajzolása (pl. tétel elrejtése) */
  function refreshOpenDropdown() {
    if (!lastDropdownContext || !activeDropdown) return;

    const { baseId, category } = lastDropdownContext;
    const openEl = getComboboxEl(baseId);
    if (!openEl?.classList.contains("is-open")) return;

    const inputEl = document.getElementById(getFieldIds(baseId).input);
    const term = inputEl && !inputEl.classList.contains("wm-combobox-input-hidden")
      ? inputEl.value
      : lastDropdownContext.term;

    renderDropdown(baseId, category, term);
  }

  /** Szerkesztő megnyitásakor / választáskor: id a rejtett mezőbe, chip frissül */
  function setValue(baseId, itemId, itemName) {
    const { input, hidden } = getFieldIds(baseId);
    const inputEl = document.getElementById(input);
    const hiddenEl = document.getElementById(hidden);

    if (inputEl) inputEl.value = itemName || "";
    if (hiddenEl) hiddenEl.value = itemId ? String(itemId) : "";

    if (itemId) {
      selectedSnapshotByBaseId.set(baseId, { id: Number(itemId), name: itemName || "" });
    } else {
      selectedSnapshotByBaseId.delete(baseId);
    }

    updateViewMode(baseId);
  }

  /** Leválasztás: mező ürítése (napi menü slotból), katalógus érintetlen */
  function clearValue(baseId) {
    setValue(baseId, null, "");
    closeCombobox(baseId);
  }

  /** Mentéskor a menu-manager ebből olvassa ki a WeeklyMenuItem.id-t */
  function getValue(baseId) {
    const { hidden } = getFieldIds(baseId);
    const value = document.getElementById(hidden)?.value?.trim();
    return value ? Number(value) : null;
  }

  function getLabel(baseId) {
    const { chip, chipLabel, input } = getFieldIds(baseId);
    const chipEl = document.getElementById(chip);
    if (chipEl && !chipEl.classList.contains("hidden")) {
      return document.getElementById(chipLabel)?.textContent?.trim() || "";
    }
    return document.getElementById(input)?.value?.trim() || "";
  }

  /** menu-manager kompatibilitás — korábbi updateItemActions hívások */
  function updateItemActions(baseId) {
    updateViewMode(baseId);
  }

  function bindEvents() {
    if (bound) return;
    bound = true;

    document.addEventListener("input", (e) => {
      const input = e.target.closest(".wm-combobox-input");
      if (!input || input.classList.contains("wm-combobox-input-hidden")) return;

      const baseId = input.id.replace(/-input$/, "");
      const category = input.closest(".wm-combobox")?.dataset.category;
      if (!category) return;

      const hiddenEl = document.getElementById(`${baseId}-id`);
      // Gépelés közben nincs érvényes kiválasztás, amíg új opciót nem választ
      if (hiddenEl) hiddenEl.value = "";
      updateViewMode(baseId);

      input.closest(".wm-combobox")?.classList.add("is-open");
      renderDropdown(baseId, category, input.value);
    });

    document.addEventListener("focusin", (e) => {
      const input = e.target.closest(".wm-combobox-input");
      if (!input || input.classList.contains("wm-combobox-input-hidden")) return;

      const baseId = input.id.replace(/-input$/, "");
      const category = input.closest(".wm-combobox")?.dataset.category;
      if (!category) return;

      closeAllComboboxes();
      openCombobox(baseId, category);
    });

    document.addEventListener("mousedown", (e) => {
      const input = e.target.closest(".wm-combobox-input");
      if (!input || input.classList.contains("wm-combobox-input-hidden")) return;

      const baseId = input.id.replace(/-input$/, "");
      const category = input.closest(".wm-combobox")?.dataset.category;
      if (!category) return;

      closeAllComboboxes();
      openCombobox(baseId, category);
    });

    document.addEventListener("click", (e) => {
      const hideBtn = e.target.closest(".wm-combobox-hide-btn");
      if (hideBtn) {
        e.preventDefault();
        e.stopPropagation();
        document.dispatchEvent(
          new CustomEvent("weekly-menu:hide-item", {
            detail: {
              baseId: hideBtn.dataset.baseId,
              itemId: Number(hideBtn.dataset.itemId),
              itemName: hideBtn.dataset.itemName || "",
            },
          }),
        );
        return;
      }

      const option = e.target.closest(".wm-combobox-option");
      if (option) {
        const item = allItems.find((entry) => entry.id === Number(option.dataset.itemId));
        if (item) setValue(option.dataset.baseId, item.id, item.name);
        closeCombobox(option.dataset.baseId);
        return;
      }

      const createOption = e.target.closest(".wm-combobox-create-option");
      if (createOption) {
        closeCombobox(createOption.dataset.baseId);
        document.dispatchEvent(
          new CustomEvent("weekly-menu:add-item", {
            detail: {
              category: createOption.dataset.category,
              baseId: createOption.dataset.baseId,
              suggestedName: createOption.dataset.name || "",
            },
          }),
        );
        return;
      }

      const renameOption = e.target.closest(".wm-combobox-rename-option");
      if (renameOption) {
        closeCombobox(renameOption.dataset.baseId);
        document.dispatchEvent(
          new CustomEvent("weekly-menu:rename-selected", {
            detail: {
              category: renameOption.dataset.category,
              baseId: renameOption.dataset.baseId,
              itemId: Number(renameOption.dataset.itemId),
              currentName: renameOption.dataset.currentName || "",
              suggestedName: renameOption.dataset.name || "",
            },
          }),
        );
        return;
      }

      const renameChipBtn = e.target.closest(".wm-combobox-chip-rename");
      if (renameChipBtn) {
        const baseId = renameChipBtn.dataset.baseId;
        const snapshot = selectedSnapshotByBaseId.get(baseId);
        enterSearchMode(baseId, snapshot?.name || getLabel(baseId));
        return;
      }

      const clearChipBtn = e.target.closest(".wm-combobox-chip-clear");
      if (clearChipBtn) {
        clearValue(clearChipBtn.dataset.baseId);
        return;
      }

      if (!e.target.closest(".wm-combobox")) {
        closeAllComboboxes();
      }
    });

    document.addEventListener("focusout", (e) => {
      const input = e.target.closest(".wm-combobox-input");
      if (!input || input.classList.contains("wm-combobox-input-hidden")) return;

      const baseId = input.id.replace(/-input$/, "");
      const combobox = input.closest(".wm-combobox");

      // Tab vagy más mezőre kattintás: bezárás + chip visszaállítás
      setTimeout(() => {
        if (combobox?.contains(document.activeElement)) return;
        closeCombobox(baseId);
      }, 0);
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
    refreshOpenDropdown,
    CATEGORY_LABELS,
  };
})();

window.WeeklyMenuCombobox = WeeklyMenuCombobox;

document.addEventListener("DOMContentLoaded", () => WeeklyMenuCombobox.init());
