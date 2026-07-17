// ======================================================
// ÉTLAP — kategóriák és ételek az adatbázisból (GET /api/categories/, GET /api/menu/)
//  Étlap oldal dinamikus tartalma
// ======================================================

const CATEGORIES_API = "/api/categories/";
const MENU_API = "/api/menu/";

const UPPERCASE_CATEGORIES = ["Előételek", "Levesek", "Desszertek", "Italok"];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ & /g, "-")
    .replace(/ és /g, "-")
    .replace(/\s+/g, "-")
    .replace(/[áéíóöőúüű]/g, (m) =>
      ({ á: "a", é: "e", í: "i", ó: "o", ö: "o", ő: "o", ú: "u", ü: "u", ű: "u" }[m]),
    );
}

function formatCategoryName(name) {
  const formatted = name.replace(/ és /g, " & ");
  if (UPPERCASE_CATEGORIES.includes(name)) {
    return formatted.toUpperCase();
  }
  return formatted.replace(/(^|[\s&-])([a-záéíóöőúüű])/gi, (match, sep, char) => sep + char.toUpperCase());
}

function formatPrice(price) {
  return `${Math.round(parseFloat(price))} Ft`;
}

function clearEtlapItems() {
  document.querySelectorAll(".menu-section .menu-item").forEach((el) => el.remove());
  document.getElementById("allergen-tajekoztato")?.remove();
}

function renderCategoryNav(categories) {
  const nav = document.querySelector(".cat-nav");
  if (!nav) return;

  nav.innerHTML = categories
    .map((cat, i) => {
      const id = slugify(cat.name);
      const label = formatCategoryName(cat.name);
      const sep = i !== categories.length - 1 ? '<span class="sep">|</span>' : "";
      return `<a href="#${id}">${label}</a>${sep}`;
    })
    .join("");
}

function renderAllergenGuide(allergenMap) {
  if (allergenMap.size === 0) return;

  const section = document.createElement("section");
  section.className = "allergen-info";
  section.id = "allergen-tajekoztato";

  const title = document.createElement("h3");
  title.className = "section-title";
  title.textContent = "ALLERGÉN TÁJÉKOZTATÓ";

  const note = document.createElement("p");
  note.className = "allergen-note";
  note.innerHTML =
    "<strong>Az ételek mellett szereplő szimbólumok az allergéneket jelölik.</strong><br>Kérdés esetén kérjük, fordulj a munkatársainkhoz.";

  const rule = document.createElement("div");
  rule.className = "section-rule";

  const grid = document.createElement("div");
  grid.className = "allergen-grid";

  allergenMap.forEach((allergen) => {
    const item = document.createElement("div");
    item.className = "allergen-item";

    const img = document.createElement("img");
    img.src = allergen.icon;
    img.alt = allergen.name;

    const text = document.createElement("span");
    text.textContent = allergen.label;

    item.appendChild(img);
    item.appendChild(text);
    grid.appendChild(item);
  });

  section.appendChild(title);
  section.appendChild(rule);
  section.appendChild(note);
  section.appendChild(grid);

  const footer = document.querySelector(".menu-footer");
  footer?.parentNode?.insertBefore(section, footer);
}

function renderMenuItems(foods) {
  const grouped = {};
  const allergenMap = new Map();

  foods.forEach((food) => {
    const categoryId = food.category.id;
    if (!grouped[categoryId]) {
      grouped[categoryId] = { name: food.category.name, items: [] };
    }
    grouped[categoryId].items.push(food);

    (food.allergens || []).forEach((a) => {
      if (!allergenMap.has(a.name)) {
        allergenMap.set(a.name, a);
      }
    });
  });

  Object.values(grouped).forEach((data) => {
    const section = document.getElementById(slugify(data.name));
    if (!section) {
      console.warn("Nincs ilyen szekció:", data.name);
      return;
    }

    data.items.forEach((food) => {
      const itemWrapper = document.createElement("div");
      itemWrapper.className = "menu-item";

      const row = document.createElement("div");
      row.className = "menu-row";

      const name = document.createElement("span");
      name.className = "dish-left";
      name.textContent = food.name;

      const dots = document.createElement("span");
      dots.className = "dots";

      const price = document.createElement("span");
      price.className = "dish-price";
      price.textContent = formatPrice(food.price);

      row.appendChild(name);
      row.appendChild(dots);
      row.appendChild(price);
      itemWrapper.appendChild(row);

      if (food.description?.trim()) {
        const desc = document.createElement("p");
        desc.className = "dish-desc";
        desc.textContent = food.description;
        itemWrapper.appendChild(desc);
      }

      if (food.allergens?.length) {
        const allergensDiv = document.createElement("div");
        allergensDiv.className = "allergens";
        food.allergens.forEach((a) => {
          const img = document.createElement("img");
          img.src = a.icon;
          img.alt = a.name;
          img.title = a.name;
          allergensDiv.appendChild(img);
        });
        itemWrapper.appendChild(allergensDiv);
      }

      section.appendChild(itemWrapper);
    });
  });

  renderAllergenGuide(allergenMap);
}

/** Kategóriák + ételek betöltése az API-ból */
async function loadEtlapFromApi() {
  const [catRes, menuRes] = await Promise.all([fetch(CATEGORIES_API), fetch(MENU_API)]);

  if (!catRes.ok) throw new Error("Nem sikerült betölteni a kategóriákat");
  if (!menuRes.ok) throw new Error("Nem sikerült betölteni az ételeket");

  const categories = await catRes.json();
  const foods = await menuRes.json();

  renderCategoryNav(categories);
  renderMenuItems(foods);

  return { categories, foods };
}

/** Újratöltés — hívók: DOMContentLoaded, live-sync.js → onRevisionChanged() */
async function refreshEtlap() {
  clearEtlapItems();
  await loadEtlapFromApi();
}

window.refreshEtlap = refreshEtlap;

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector(".menu-content")) return;

  refreshEtlap().catch((err) => {
    console.error("Hiba az étlap betöltésekor:", err);
  });
});
