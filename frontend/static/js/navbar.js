/**********************
 * navbar.js — felső navigációs sáv (minden publikus oldalon)
 *
 * Mit csinál ez a fájl?
 *   - Görgetéskor „lebegő” kinézet (.scrolled) a navbaron
 *   - Mobilon hamburger menü nyit/zár (.nav-links.open)
 *   - Belső hivatkozások sima görgetése (#rolunk, #kapcsolat) — navbar magasság kompenzálva
 *   - Aktuális oldal / szekció linkjének kiemelése (.active)
 *
 * HTML: templates/components/navbar.html (.navbar, #navToggle, .nav-links)
 * Betöltés: base.html — minden publikus oldalon
 **********************/

document.addEventListener("DOMContentLoaded", () => {
  setupNavbar();
  setActiveNav();
  // Hash változás (pl. /#rolunk) — aktív link frissítése
  window.addEventListener("hashchange", setActiveNav);
});

// Ennyi px görgetés után kap „scrolled” stílust a navbar (átlátszó → solid háttér)
const SCROLL_THRESHOLD = 50;

// Görgetés alapján be/ki kapcsolja a .scrolled osztályt
function updateNavbarScrolled(navbar) {
  navbar.classList.toggle("scrolled", window.scrollY > SCROLL_THRESHOLD);
}

// Navbar események: scroll, mobil toggle, anchor linkek
function setupNavbar() {
  const navbar = document.querySelector(".navbar");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.querySelector(".nav-links");

  if (!navbar || !navToggle || !navLinks) return;

  // Görgetés figyelése — anchor animáció közben kihagyjuk (dataset.anchorScrolling)
  window.addEventListener(
    "scroll",
    () => {
      if (navbar.dataset.anchorScrolling === "true") return;
      updateNavbarScrolled(navbar);
    },
    { passive: true },
  );

  // Hamburger gomb: mobil menü megnyitása / bezárása
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  setupAnchorScroll(navbar, navLinks);
}

// Belső linkek (#rolunk, #kapcsolat): sima görgetés, navbar alá igazítva
function setupAnchorScroll(navbar, navLinks) {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  navLinks.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      e.preventDefault();

      const offset = navbar.offsetHeight + 20;
      const top =
        target.getBoundingClientRect().top + window.scrollY - offset;

      // Cél pozíció alapján előre beállítjuk a scrolled kinézetet (ugrás animáció nélkül)
      const willLeaveTop = window.scrollY <= SCROLL_THRESHOLD && top > SCROLL_THRESHOLD;
      const willReturnTop = top <= SCROLL_THRESHOLD;

      navbar.dataset.anchorScrolling = "true";
      navbar.classList.add("no-transition");

      if (willLeaveTop) {
        navbar.classList.add("scrolled");
      } else if (willReturnTop) {
        navbar.classList.remove("scrolled");
      }

      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      finishAnchorScroll(navbar, prefersReducedMotion);
      navLinks.classList.remove("open");
    });
  });
}

// Anchor görgetés vége: visszaállítjuk a scroll logikát és a transitiont
function finishAnchorScroll(navbar, prefersReducedMotion) {
  const done = () => {
    navbar.dataset.anchorScrolling = "false";
    navbar.classList.remove("no-transition");
    updateNavbarScrolled(navbar);
  };

  if (prefersReducedMotion) {
    done();
    return;
  }

  if ("onscrollend" in window) {
    window.addEventListener("scrollend", done, { once: true });
  } else {
    window.setTimeout(done, 900);
  }
}

// URL path normalizálás — / és /fooldal/ egyaránt „/”
function normalizeNavPath(pathname) {
  const trimmed = (pathname || "/").replace(/\/+$/, "") || "";
  return trimmed === "" ? "/" : trimmed;
}

// Nav link href → { path, hash } (pl. /#rolunk → path=/, hash=#rolunk)
function parseNavHref(href) {
  if (!href) return { path: "/", hash: "" };

  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) {
    return { path: normalizeNavPath(href), hash: "" };
  }

  return {
    path: normalizeNavPath(href.slice(0, hashIndex) || "/"),
    hash: href.slice(hashIndex),
  };
}

// Aktuális oldal / szekció linkjére .active — Django útvonalak + hash (#rolunk, #kapcsolat)
function setActiveNav() {
  const currentPath = normalizeNavPath(window.location.pathname);
  const currentHash = window.location.hash || "";

  document.querySelectorAll(".nav-links a").forEach((link) => {
    const { path: linkPath, hash: linkHash } = parseNavHref(
      link.getAttribute("href"),
    );

    let isActive = false;

    if (linkHash) {
      // Pl. /#rolunk — csak akkor aktív, ha path és hash is egyezik
      isActive = currentPath === linkPath && currentHash === linkHash;
    } else if (linkPath === "/") {
      // Főoldal — aktív, ha nincs hash, vagy nem szekció-hash
      isActive =
        currentPath === "/" &&
        (currentHash === "" ||
          (currentHash !== "#rolunk" && currentHash !== "#kapcsolat"));
    } else {
      // Pl. /etlap — path egyezik, hash nélkül
      isActive = currentPath === linkPath && currentHash === "";
    }

    link.classList.toggle("active", isActive);
  });
}
