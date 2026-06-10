fetch("../components/navbar.html")
  .then((response) => response.text())
  .then((html) => {
    document.getElementById("navbar").innerHTML = html;

    setupNavbar();
    setActiveNav();
  })
  .catch((error) => {
    console.error("Error loading navbar:", error);
  });

const SCROLL_THRESHOLD = 50;

function updateNavbarScrolled(navbar) {
  navbar.classList.toggle("scrolled", window.scrollY > SCROLL_THRESHOLD);
}

function setupNavbar() {
  const navbar = document.querySelector(".navbar");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.querySelector(".nav-links");

  if (!navbar || !navToggle || !navLinks) return;

  window.addEventListener(
    "scroll",
    () => {
      if (navbar.dataset.anchorScrolling === "true") return;
      updateNavbarScrolled(navbar);
    },
    { passive: true },
  );

  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  setupAnchorScroll(navbar, navLinks);
}

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

function setActiveNav() {
  let currentPage = window.location.pathname.split("/").pop();

  if (currentPage === "") {
    currentPage = "homepage.html";
  }

  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });
}
