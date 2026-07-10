// ======================================================
// KOSÁR — felhasználóhoz kötött tárolás (localStorage)
// Beküldés előtt itt marad; POST /api/orders/create/ után törlődik.
// ======================================================

// Aktuális bejelentkezett user ID — csak ő látja a saját kosarát
window.CART_USER_ID = null;

// Hét napjai és megjelenítési neveik
const WEEKDAYS = ["hetfo", "kedd", "szerda", "csutortok", "pentek"];

const DAY_LABELS = {
    hetfo: "Hétfő",
    kedd: "Kedd",
    szerda: "Szerda",
    csutortok: "Csütörtök",
    pentek: "Péntek",
};

// delivery_date (YYYY-MM-DD) → magyar megjelenítés
const MONTH_LABELS = [
    "jan.", "feb.", "már.", "ápr.", "máj.", "jún.",
    "júl.", "aug.", "szept.", "okt.", "nov.", "dec.",
];

function formatDeliveryDate(isoDate) {
    if (!isoDate) {
        return "";
    }

    const [year, month, day] = isoDate.split("-").map(Number);
    return `${year}. ${MONTH_LABELS[month - 1]} ${day}.`;
}


// Oldal betöltéskor: auth ellenőrzés, majd kosár inicializálás
document.addEventListener("DOMContentLoaded", async () => {
    const user = await window.checkAuthSession?.();
    setCartUserId(user?.id ?? null);

    migrateLegacyCartStorage();
    initCart();
    validateCartItems({ silent: false });
    renderCart();
    initCartUnloadWarning();
});


// Bejelentkezett user ID beállítása (login.js is hívja)
function setCartUserId(userId) {
    window.CART_USER_ID = userId ? Number(userId) : null;
}

window.setCartUserId = setCartUserId;


// localStorage kulcs: minden usernek saját kosara van
function getCartStorageKey() {
    if (!window.CART_USER_ID) {
        return null;
    }

    return `cart_user_${window.CART_USER_ID}`;
}


// Régi sessionStorage / közös kulcs → localStorage
function migrateLegacyCartStorage() {
    const legacyKeys = ["cart"];

    if (window.CART_USER_ID) {
        const userKey = getCartStorageKey();
        const fromSession = sessionStorage.getItem(userKey);
        if (fromSession && !localStorage.getItem(userKey)) {
            localStorage.setItem(userKey, fromSession);
        }
        sessionStorage.removeItem(userKey);
    }

    legacyKeys.forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
}


// Dátum formázása YYYY-MM-DD-re (helyi időzóna, nem UTC)
function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}


// ======================================================
// Rendelhető napok — napi menü dropdown feltöltéséhez
// ======================================================
// Hétfő–csütörtök: holnaptól az aktuális hét péntekéig
// Péntek, szombat, vasárnap: következő hét hétfő–péntek
function getAvailableOrderDays(referenceDate = new Date()) {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);

    const dow = today.getDay(); // 0=vasárnap, 1=hétfő, ..., 5=péntek, 6=szombat

    // Pénteken, szombaton és vasárnap a következő hét minden munkanapja választható
    if (dow === 5 || dow === 6 || dow === 0) {
        return [...WEEKDAYS];
    }

    // Hétfő–csütörtök: holnaptól a hét végéig (péntekig)
    return WEEKDAYS.slice(dow);
}

window.getAvailableOrderDays = getAvailableOrderDays;


// ======================================================
// delivery_date számítás — minden tételhez külön dátum
// ======================================================
// Hétfő–csütörtök: kiválasztott nap az aktuális héten (≥ holnap)
// Péntek, szombat, vasárnap: kiválasztott nap a következő héten
function calculateDeliveryDate(selectedDay, referenceDate = new Date()) {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);

    const dow = today.getDay();

    const dayMap = {
        hetfo: 1,
        kedd: 2,
        szerda: 3,
        csutortok: 4,
        pentek: 5,
    };

    const targetDow = dayMap[selectedDay];
    const result = new Date(today);

    if (dow === 5 || dow === 6 || dow === 0) {
        // Következő hét hétfőjének meghatározása
        let daysUntilNextMonday;
        if (dow === 5) daysUntilNextMonday = 3;      // péntek → hétfő
        else if (dow === 6) daysUntilNextMonday = 2; // szombat → hétfő
        else daysUntilNextMonday = 1;                // vasárnap → hétfő

        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilNextMonday);

        // A kiválasztott nap a jövő heti héten
        result.setTime(nextMonday.getTime());
        result.setDate(nextMonday.getDate() + (targetDow - 1));
    } else {
        // Aktuális héten: hány nap múlva van a kiválasztott nap
        const diff = targetDow - dow;
        result.setDate(today.getDate() + diff);
    }

    return formatDateISO(result);
}

window.calculateDeliveryDate = calculateDeliveryDate;


// Nap-választó dropdown dinamikus feltöltése a rendelhető napokkal
function populateDaySelect() {
    const daySelect = document.getElementById("day");
    const submitBtn = document.getElementById("addToCartBtn");

    if (!daySelect) {
        return;
    }

    const availableDays = getAvailableOrderDays();
    daySelect.innerHTML = "";

    // Ha nincs rendelhető nap, letiltjuk a rendelést
    if (availableDays.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Jelenleg nincs rendelhető nap";
        daySelect.appendChild(option);

        if (submitBtn) {
            submitBtn.disabled = true;
        }

        return;
    }

    if (submitBtn) {
        submitBtn.disabled = false;
    }

    availableDays.forEach((day) => {
        const option = document.createElement("option");
        option.value = day;
        option.textContent = DAY_LABELS[day];
        daySelect.appendChild(option);
    });
}

window.populateDaySelect = populateDaySelect;


// CSRF token olvasása a rendelés POST kéréséhez
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
    return null;
}


function lockPageScroll() {
    // Kosár nyitva: csak a drawer görgethető, ne az oldal mögötte
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
}

function unlockPageScroll() {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
}

function closeCartDrawer() {
    document.getElementById("cartDrawer")?.classList.remove("active");
    document.getElementById("cartOverlay")?.classList.remove("active");
    unlockPageScroll();
}

window.closeCart = closeCartDrawer;

function initCart() {
    const closeCart = document.getElementById("closeCart");
    const checkoutBtn = document.getElementById("checkoutBtn");

    window.openCart = () => {
        document.getElementById("cartDrawer")?.classList.add("active");
        document.getElementById("cartOverlay")?.classList.add("active");
        lockPageScroll();
        validateCartItems({ silent: true });
        renderCart();

        // Napi menü űrlap visszaállítása: első rendelhető nap + A/B jelölés törlése
        window.resetDailyMenuForm?.();
    };

    closeCart?.addEventListener("click", closeCartDrawer);
    document.getElementById("cartOverlay")?.addEventListener("click", closeCartDrawer);
    checkoutBtn?.addEventListener("click", handleCheckout);

    renderCart();
}


// Kosár betöltése — nincs bejelentkezve → mindig üres (adat localStorage-ban megmarad)
function getCart() {
    const storageKey = getCartStorageKey();

    if (!storageKey) {
        return {
            items: [],
            total_price: 0,
        };
    }

    const cart = localStorage.getItem(storageKey);

    if (!cart) {
        return {
            items: [],
            total_price: 0,
        };
    }

    return JSON.parse(cart);
}


/**
 * Elavult / nem rendelhető tételek eltávolítása, delivery_date frissítése.
 * @returns {{ removed: number, updated: boolean }}
 */
function validateCartItems({ silent = true } = {}) {
    const storageKey = getCartStorageKey();
    if (!storageKey) {
        return { removed: 0, updated: false };
    }

    const cart = getCart();
    if (!cart.items.length) {
        return { removed: 0, updated: false };
    }

    const availableDays = getAvailableOrderDays();
    const today = formatDateISO(new Date());
    const kept = [];
    let removed = 0;

    cart.items.forEach((item) => {
        if (!item.day || !availableDays.includes(item.day)) {
            removed += 1;
            return;
        }

        item.delivery_date = calculateDeliveryDate(item.day);

        if (item.delivery_date < today) {
            removed += 1;
            return;
        }

        kept.push(item);
    });

    const changed = removed > 0 || kept.length !== cart.items.length;

    if (changed) {
        cart.items = sortCartItems(kept);
        cart.total_price = calculateCartTotal(cart.items);

        if (cart.items.length) {
            localStorage.setItem(storageKey, JSON.stringify(cart));
        } else {
            localStorage.removeItem(storageKey);
        }

        if (!silent && removed > 0) {
            window.showToast?.(
                removed === 1
                    ? "1 elavult tétel eltávolítva a kosárból."
                    : `${removed} elavult tétel eltávolítva a kosárból.`,
                "info",
            );
        }

        return { removed, updated: true };
    }

    // Dátumok frissítése (pl. hét váltás után)
    let datesChanged = false;
    cart.items.forEach((item) => {
        const nextDate = calculateDeliveryDate(item.day);
        if (item.delivery_date !== nextDate) {
            item.delivery_date = nextDate;
            datesChanged = true;
        }
    });

    if (datesChanged) {
        saveCart(cart);
    }

    return { removed: 0, updated: datesChanged };
}

window.validateCartItems = validateCartItems;


function getCartLineCount() {
    return getCart().items.length;
}

window.getCartLineCount = getCartLineCount;


function initCartUnloadWarning() {
    window.addEventListener("beforeunload", (event) => {
        if (!window.CART_USER_ID || getCartLineCount() === 0) {
            return;
        }

        event.preventDefault();
        event.returnValue = "";
    });
}


// Kosár tételeinek rendezése: delivery_date növekvő, azon belül A menü, majd B menü
function sortCartItems(items) {
    const menuOrder = { A: 0, B: 1 };

    return items.sort((a, b) => {
        const dateCompare = (a.delivery_date || "").localeCompare(b.delivery_date || "");
        if (dateCompare !== 0) {
            return dateCompare;
        }

        return (menuOrder[a.menu_type] ?? 9) - (menuOrder[b.menu_type] ?? 9);
    });
}


// Egy tétel egyedi azonosítója: adott nap + menütípus (pl. péntek + A)
function isDuplicateInCart(cart, item) {
    return cart.items.some(
        (existing) =>
            existing.day === item.day &&
            existing.menu_type === item.menu_type,
    );
}


// Kosár mentése — rendezés után user-specifikus kulcsra
function saveCart(cart) {
    const storageKey = getCartStorageKey();

    if (!storageKey) {
        return;
    }

    cart.items = sortCartItems(cart.items);
    cart.total_price = calculateCartTotal(cart.items);

    localStorage.setItem(storageKey, JSON.stringify(cart));
    sessionStorage.removeItem(storageKey);
}


// Kosár teljes törlése — sikeres rendelés után
function clearCart() {
    const storageKey = getCartStorageKey();

    if (storageKey) {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
    }

    localStorage.removeItem("cart");
    sessionStorage.removeItem("cart");

    if (typeof renderCart === "function") {
        renderCart();
    }
}

window.clearCart = clearCart;


// Új tételek hozzáadása — ismétlődés nem engedélyezett (nap + menütípus)
function addItemsToCart(newItems) {
    if (!window.CART_USER_ID) {
        console.warn("Nincs bejelentkezve — kosár nem módosítható.");
        return { added: false, skipped: newItems };
    }

    const cart = getCart();
    const itemsToAdd = [];
    const duplicates = [];

    newItems.forEach((item) => {
        if (isDuplicateInCart(cart, item)) {
            duplicates.push(item);
        } else {
            itemsToAdd.push(item);
        }
    });

    // Már kosárban lévő tételek — nem adhatók hozzá újra
    if (duplicates.length > 0) {
        const messages = duplicates.map((item) => {
            const dayLabel = DAY_LABELS[item.day] || item.day;
            return `${dayLabel} – ${item.menu_type} menü`;
        });

        window.showToast?.(`Ez a tétel már a kosárban van: ${messages.join(", ")}`, "error");
    }

    if (itemsToAdd.length === 0) {
        return { added: false, skipped: duplicates };
    }

    cart.items.push(...itemsToAdd);
    saveCart(cart);

    const message =
        itemsToAdd.length === 1
            ? "A menü hozzáadva a kosárhoz."
            : `${itemsToAdd.length} menü hozzáadva a kosárhoz.`;

    window.showToast?.(message, "success");

    console.log("Kosár frissítve:", cart);
    return { added: true, skipped: duplicates };
}

window.addItemsToCart = addItemsToCart;


/** Kosárban lévő menük összes darabszáma (pl. 2× A + 1× B → 3). */
function getCartTotalQuantity() {
    if (!window.CART_USER_ID) {
        return 0;
    }

    return getCart().items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

/** Külön kosársorok száma (pl. hétfő A + hétfő B → 2). */
function getCartLineCount() {
    if (!window.CART_USER_ID) {
        return 0;
    }

    return getCart().items.length;
}

function updateCartBadge() {
    const badge = document.getElementById("cartBadge");
    const btn = document.querySelector(".cart-icon-btn");
    if (!badge) {
        return;
    }

    const count = getCartTotalQuantity();

    if (count > 0) {
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.classList.remove("is-hidden");
        btn?.setAttribute("aria-label", `Kosár, ${count} tétel`);
        btn?.setAttribute("title", `Kosár (${count} tétel)`);
    } else {
        badge.classList.add("is-hidden");
        btn?.setAttribute("aria-label", "Kosár");
        btn?.setAttribute("title", "Kosár");
    }
}

window.updateCartBadge = updateCartBadge;


function renderCart() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotalPrice");

    if (!cartItems || !cartTotal) {
        return;
    }

    const cart = getCart();

    cartItems.innerHTML = "";

    if (cart.items.length === 0) {
        cartItems.innerHTML = `
        <p class="empty-cart">
            A kosár üres.
        </p>
        `;

        cartTotal.textContent = "0 Ft";
        updateCartBadge();
        return;
    }

    cart.items.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "cart-item";

        const dayLabel = DAY_LABELS[item.day] || item.day;
        const deliveryLabel = formatDeliveryDate(item.delivery_date);

        div.innerHTML = `
          <div class="cart-item-info">
              <div class="cart-item-meta">
                  <div class="cart-item-day-group">
                      <span class="cart-item-day">${dayLabel}</span>
                      <span class="cart-item-type">${item.menu_type} menü</span>
                  </div>
                  <span class="cart-item-delivery" title="Kiszállítás napja">
                      <i class="fa-regular fa-calendar"></i>
                      ${deliveryLabel}
                  </span>
              </div>

              <span class="cart-item-desc">
                  ${item.name}
              </span>

              <div class="cart-controls">
                  <div class="cart-qty-stepper">
                      <button
                          type="button"
                          class="qty-btn"
                          aria-label="Mennyiség csökkentése"
                          onclick="changeCartQty(${index}, -1)">
                          −
                      </button>

                      <span class="cart-item-qty">
                          ${item.quantity}
                      </span>

                      <button
                          type="button"
                          class="qty-btn"
                          aria-label="Mennyiség növelése"
                          onclick="changeCartQty(${index}, 1)">
                          +
                      </button>
                  </div>

                  <button
                      type="button"
                      class="remove-cart-btn"
                      aria-label="Tétel törlése"
                      onclick="removeCartItem(${index})">
                      <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                  </button>
              </div>
          </div>

          <span class="cart-item-price">
              ${item.unit_price * item.quantity} Ft
          </span>
        `;

        cartItems.appendChild(div);
    });

    cartTotal.textContent = `${cart.total_price} Ft`;
    updateCartBadge();
}


function changeCartQty(index, change) {
    const cart = getCart();

    if (!cart.items[index]) {
        return;
    }

    cart.items[index].quantity += change;

    // Ha a mennyiség 0 vagy kevesebb → tétel törlése
    if (cart.items[index].quantity <= 0) {
        cart.items.splice(index, 1);
    }

    saveCart(cart);
    renderCart();
}


function removeCartItem(index) {
    const cart = getCart();

    cart.items.splice(index, 1);
    saveCart(cart);
    renderCart();
}


function calculateCartTotal(items) {
    return items.reduce(
        (sum, item) => sum + (item.unit_price * item.quantity),
        0,
    );
}


// Checkout adatok — cím a bejelentkezett user profiljából
async function createCheckoutData() {
    const cart = getCart();
    const user = await window.checkAuthSession?.();

    const checkoutData = {
        delivery_address: user?.address || "",

        items: cart.items.map((item) => ({
            weekly_menu: item.weekly_menu_id,
            delivery_date: item.delivery_date,
            quantity: item.quantity,
        })),
    };

    return checkoutData;
}


async function handleCheckout() {
    if (!window.CART_USER_ID) {
        window.showToast?.("A rendeléshez be kell jelentkeznie!", "error");
        return;
    }

    validateCartItems({ silent: false });

    const cart = getCart();

    if (cart.items.length === 0) {
        window.showToast?.("A kosár üres, vagy minden tétel lejárt.", "error");
        renderCart();
        return;
    }

    const checkoutData = await createCheckoutData();

    if (!checkoutData.delivery_address?.trim()) {
        window.showToast?.(
            "Hiányzik a kiszállítási cím. Kérjük, frissítse a profilját!",
            "error",
        );
        return;
    }

    console.log("Checkout adatok:", checkoutData);

    const csrfToken = getCookie("csrftoken");

    try {
        const response = await fetch("/api/orders/create/", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
            },
            body: JSON.stringify(checkoutData),
        });

        let data = null;
        try {
            data = await response.json();
        } catch (error) {
            data = null;
        }

        if (!response.ok) {
            const message =
                data?.detail ||
                Object.values(data || {})
                    .flat()
                    .find(Boolean) ||
                "Hiba történt a rendelés elküldésekor!";

            window.showToast?.(message, "error");
            console.error("Rendelési hiba:", response.status, data);
            return;
        }

        console.log("Sikeres rendelés:", data);
        window.showToast?.("Rendelés sikeresen elküldve!", "success");
        clearCart();
        closeCartDrawer();
    } catch (error) {
        console.error("Rendelési hiba:", error);
        window.showToast?.("Hiba történt a rendelés elküldésekor!", "error");
    }
}
