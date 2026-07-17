/**********************
 * guest-portal/js/account.js — Adataim szekció
 * Ez a vendégközpont profil szerkesztő része. A MeView PATCH végpontját hívja.
 * 
 *
 * 
 * Html kapcsolat: guest-portal/index.html
 *
 * API: PATCH /api/auth/me/
 *
 * Szerkeszthető: név, telefon, cím
 * Nem szerkeszthető: email (zárolt mező az űrlapon)
 *
 * Megjelenítés:
 *  - Név + szerepkör → topbar chip (index.js fillGuestPortalHeader)
 *  - Reg. dátum → kontextus sáv az űrlap felett
 *  - Két kártya: személyes adatok + szállítási cím
 *
 * Élő szinkron: reloadGuestAccount() — guest-portal-sync.js hívja revision változásra
 **********************/

function formatRegistrationDate(isoDate) {
  if (!isoDate) return "";

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Név formázás — ugyanaz a logika, mint regisztrációnál (login.js)
function formatAccountName(name) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

// API hibaüzenet kiolvasása (pl. { name: ["..."] } vagy { detail: "..." })
function getApiErrorMessage(data, fallback = "Mentés sikertelen.") {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  const firstKey = Object.keys(data)[0];
  if (!firstKey) {
    return fallback;
  }

  const value = data[firstKey];
  if (Array.isArray(value)) {
    return value[0];
  }

  return String(value);
}

// Kontextus sáv kitöltése — csak reg. dátum (név/szerepkör a topbarban van)
function fillAccountProfile(user) {
  const joinedEl = document.getElementById("accountProfileJoined");

  if (joinedEl) {
    const formatted = formatRegistrationDate(user?.date_joined);
    joinedEl.textContent = formatted
      ? `Fiók létrehozva: ${formatted}`
      : "Fiók adatai";
  }
}

// Szerkeszthető mezők kitöltése
function fillAccountForm(user) {
  const email = document.getElementById("accountEmail");
  const name = document.getElementById("accountName");
  const phone = document.getElementById("accountPhone");
  const address = document.getElementById("accountAddress");

  if (email) email.value = user?.email || "";
  if (name) name.value = user?.name || "";
  if (phone) phone.value = user?.phone_number || "";
  if (address) address.value = user?.address || "";
}

// Mentés közben: gombok letiltása, dupla küldés ellen — live-sync is kihagyja a frissítést
let accountFormBusy = false;

function setAccountFormBusy(busy) {
  accountFormBusy = busy;
  const saveBtn = document.getElementById("accountSaveBtn");

  if (saveBtn) {
    saveBtn.disabled = busy; // Mentés közben gombok/mezők letiltva
    saveBtn.textContent = busy ? "Mentés..." : "Adataim mentése";
  }

  // Csak a szerkeszthető mezők — az e-mail mindig readonly marad
  ["accountName", "accountPhone", "accountAddress"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = busy;
  });
}

// Mentés — PATCH /api/auth/me/, majd profil fejléc + topbar frissítése
async function saveAccountForm(event) {
  event.preventDefault();

  const nameInput = document.getElementById("accountName");
  const phoneInput = document.getElementById("accountPhone");
  const addressInput = document.getElementById("accountAddress");

  const name = formatAccountName(nameInput?.value || "");
  const phone_number = (phoneInput?.value || "").trim();
  const address = (addressInput?.value || "").trim();


  // Frontend validáció ********************************************
  if (name.length < 2) {
    window.showToast?.("A név legalább 2 karakter hosszú legyen.", "error");
    nameInput?.focus();
    return;
  }

  if (!phone_number) {
    window.showToast?.("A telefonszám megadása kötelező.", "error");
    phoneInput?.focus();
    return;
  }

  if (!address) {
    window.showToast?.("A szállítási cím megadása kötelező.", "error");
    addressInput?.focus();
    return;
  }
  //  Frontend validáció vége ********************************************

  setAccountFormBusy(true); // dupla küldés ellen

  try {
    const response = await apiRequest("/api/auth/me/", {
      method: "PATCH",
      body: JSON.stringify({ name, phone_number, address }),
    });

    const data = await response.json();

    if (!response.ok) {
      window.showToast?.(getApiErrorMessage(data), "error");
      return;
    }

    window.CURRENT_USER = data;
    fillAccountForm(data);
    fillAccountProfile(data);

    // Topbar chip szinkronban marad a névvel
    if (typeof fillGuestPortalHeader === "function") {
      fillGuestPortalHeader(data);
    }

    window.showToast?.("Adataid sikeresen mentve!", "success");
  } catch (error) {
    console.error("Adataim mentése sikertelen:", error);
    window.showToast?.("Hiba történt a mentés során.", "error");
  } finally {
    setAccountFormBusy(false);
  }
}

// Belépési pont — index.js hívja auth ellenőrzés után
function initAccountSection() {
  const form = document.getElementById("accountForm");
  if (!form) {
    return;
  }

  const user = window.CURRENT_USER;
  fillAccountProfile(user); // kitölti a reg. dátumot
  fillAccountForm(user); // kitölti az űrlapot
  form.addEventListener("submit", saveAccountForm); // mentés
}

/** Felhasználó épp szerkeszt? — ne írjuk felül live-sync-kel. */
/** Megakadályozza, hogy írás közben felülírjuk, amit a user épp gépel. */
function isAccountFormEditing() {
  if (accountFormBusy) return true;

  const form = document.getElementById("accountForm");
  if (!form) return false;

  const active = document.activeElement;
  return Boolean(
    active && form.contains(active) && !["BUTTON", "A"].includes(active.tagName),
  );
}

/**
 * A reloadGuestAccount() az „Adataim” űrlap csendes frissítése — amikor a szerveren változott valami, és a live-sync ezt észleli.
 * Miért kell?
 * A vendégközpont 2 másodpercenként megnézi a szervert: nőtt-e a revision szám (live-sync.js → GET /api/revision/).
 * Ha nőtt → valaki/admin módosított adatot (pl. rendelés, profil…) → a frontend újratölti a látható adatokat, hogy ne maradjon elavult infó a * képernyőn.
 * Az Adataim résznél ez a: reloadGuestAccount().
 */
async function reloadGuestAccount() {
  const form = document.getElementById("accountForm");
  if (!form || isAccountFormEditing()) return;

  const user = await checkAuthSession();
  if (!user) return;

  window.CURRENT_USER = user;
  fillAccountProfile(user);
  fillAccountForm(user);

  if (typeof fillGuestPortalHeader === "function") {
    fillGuestPortalHeader(user);
  }
}

window.initAccountSection = initAccountSection;
window.reloadGuestAccount = reloadGuestAccount;
