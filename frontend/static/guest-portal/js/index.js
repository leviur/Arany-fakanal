/**********************
 * guest-portal/js/index.js — Vendégközpont oldal váz (/guest-portal/)
 *
 *
 * Ez a fájl NEM tartalmazza a szekciók tartalmát — csak a keretet:
 *  - session ellenőrzés (customer / admin, különben redirect /)
 *  - topbar chip (név, szerepkör, monogram)
 *  - sidebar navigáció 3 szekció között
 *  - sidebar összecsukás (asztal) + drawer (mobil)
 *  - kijelentkezés modál
 *
 * Szekciók külön fájlokban indulnak a DOMContentLoaded végén:
 *  - account.js → initAccountSection()
 *  - orders.js   → initOrdersSection()
 *  - bookings.js → initBookingsSection()
 **********************/

// Szekció címek és alcímek — a topbar frissítéséhez
const GUEST_PORTAL_SECTIONS = {
  "guest-portal-orders-section": {
    title: "Rendeléseim",
    subtitle: "Saját rendeléseid, módosítás és lemondás.",
  },
  "guest-portal-bookings-section": {
    title: "Foglalásaim",
    subtitle: "Asztalfoglalásaid kezelése egy helyen.",
  },
  "guest-portal-account-section": {
    title: "Adataim",
    subtitle: "Profilod és szállítási adataid kezelése.",
  },
};

// Monogram — ugyanaz a logika, mint login.js (főoldal profil gomb): max. 3 betű
function getInitials(name) {
  if (!name) return "?";

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

const GUEST_PORTAL_FILL_SECTIONS = new Set([
  "guest-portal-orders-section",
  "guest-portal-bookings-section",
  "guest-portal-account-section",
]);

/** Teljes panel layout — Rendeléseim / Adataim (admin dashboard mintájára). */
function updateGuestPortalLayout(targetId) {
  const main = document.querySelector(".guest-portal-app > .main");
  main?.classList.toggle("gp-fill-layout", GUEST_PORTAL_FILL_SECTIONS.has(targetId));
}

// Aktív tab váltása — a sidebar és a tartalom szinkronban marad
function switchGuestPortalSection(targetId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.toggle("active", section.id === targetId);
  });

  document.querySelectorAll(".menu a[data-target]").forEach((link) => {
    link.classList.toggle("active", link.dataset.target === targetId);
  });

  updateGuestPortalLayout(targetId);

  const meta = GUEST_PORTAL_SECTIONS[targetId];
  if (!meta) return;

  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");

  if (pageTitle) pageTitle.textContent = meta.title;
  if (pageSubtitle) pageSubtitle.textContent = meta.subtitle;

  // Mobilon menüváltás után zárjuk a drawer-t
  closeMobileSidebar?.();
}

// Felhasználói chip kitöltése a /api/auth/me/ válaszból
function fillGuestPortalHeader(user) {
  const isAdmin = user?.role === "admin";
  const displayName = isAdmin ? "Admin" : (user?.name || "Felhasználó");
  const initials = isAdmin ? "A" : getInitials(user?.name); // Monogram az avatarban (getInitials)

  const avatar = document.getElementById("guestPortalAvatar");
  const nameEl = document.getElementById("guestPortalName");
  const roleEl = document.getElementById("guestPortalRole");

  if (avatar) avatar.textContent = initials;
  if (nameEl) nameEl.textContent = displayName; // név megkelenítése

  if (roleEl) {
    if (isAdmin) {
      roleEl.textContent = "";
      roleEl.hidden = true;
    } else {
      roleEl.hidden = false;
      roleEl.textContent = "Vendég"; //  „Vendég” szerepkör
    }
  }
}

window.fillGuestPortalHeader = fillGuestPortalHeader;

// Kijelentkezés megerősítő ablak
const Logout = (() => {
  function openModal() {
    const modal = document.getElementById("logoutModal");
    if (!modal) return;

    modal.classList.remove("modal-hidden");
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeModal() {
    const modal = document.getElementById("logoutModal");
    if (!modal) return;

    modal.classList.remove("open");
    setTimeout(() => modal.classList.add("modal-hidden"), 200);
  }

  async function confirm() {
    try {
      await apiRequest("/api/auth/logout/", { method: "POST" });
    } catch (error) {
      console.error("Kijelentkezés sikertelen:", error);
    }

    window.location.href = "/";
  }

  return { openModal, closeModal, confirm };
})();

// Mobil sidebar — a closeMobileSidebar globális, hogy switchGuestPortalSection is hívja
let closeMobileSidebar = null;

// sidebar viselkedés
function initSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");

  // Asztali összecsukás — külön localStorage kulcs, ne keveredjen a dashboardéval
  if (sidebar && sidebarToggle) {
    const storageKey = "guestPortalSidebarCollapsed";

    if (localStorage.getItem(storageKey) === "true") {
      sidebar.classList.add("collapsed");
      sidebarToggle.setAttribute("aria-expanded", "false");
    }

    sidebarToggle.addEventListener("click", () => {
      const collapsed = sidebar.classList.toggle("collapsed");
      sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
      localStorage.setItem(storageKey, String(collapsed));
    });
  }

  // Mobil drawer (< 768px)
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
}

function initMenuNavigation() {
  document.querySelectorAll(".menu a[data-target]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      switchGuestPortalSection(link.dataset.target);
    });
  });
}

function initLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", Logout.openModal);
  document.getElementById("logoutCancel")?.addEventListener("click", Logout.closeModal);
  document.getElementById("logoutCancelBtn")?.addEventListener("click", Logout.closeModal);
  document.getElementById("logoutConfirmBtn")?.addEventListener("click", Logout.confirm);

  const logoutModal = document.getElementById("logoutModal");
  logoutModal?.addEventListener("click", (event) => {
    if (event.target === logoutModal) Logout.closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && logoutModal?.classList.contains("open")) {
      Logout.closeModal();
    }
  });
}

// Belépési pont
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = await checkAuthSession();

    // Be van-e jelentkezve? customer vagy admin? → ha nem → / redirect
    if (!user || !["customer", "admin"].includes(user.role)) {
      window.location.replace("/");
      return;
    }

    window.CURRENT_USER = user;
    fillGuestPortalHeader(user);
  } catch (error) {
    console.error("Auth ellenőrzés sikertelen:", error);
    window.location.replace("/");
    return;
  }

  initSidebar(); // Sidebar
  initMenuNavigation(); // menü
  initLogout(); // logout modál init
  updateGuestPortalLayout("guest-portal-account-section");
  // Adataim űrlap (account.js)
  window.initAccountSection?.();
  // Rendeléseim (orders.js)
  window.initOrdersSection?.();
  // Foglalásaim (bookings.js)
  window.initBookingsSection?.();
});
