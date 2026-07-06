/**
 * Adatkezelési tájékoztató modal — közös logika minden űrlaphoz.
 */
(function () {
  let modal = null;
  let closeBtn = null;
  let acceptBtn = null;
  let pendingCheckbox = null;
  let initialized = false;

  function open() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  }

  function close() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    pendingCheckbox = null;
  }

  function bindOpenTriggers() {
    document.querySelectorAll("[data-open-privacy-modal]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const label = btn.closest("label");
        pendingCheckbox = label?.querySelector('input[type="checkbox"]') ?? null;
        open();
      });
    });
  }

  function init() {
    if (initialized) return;
    modal = document.getElementById("privacyModal");
    if (!modal) return;

    initialized = true;
    closeBtn = document.getElementById("closePrivacyModal");
    acceptBtn = document.getElementById("privacyModalAccept");

    bindOpenTriggers();

    closeBtn?.addEventListener("click", close);
    acceptBtn?.addEventListener("click", () => {
      if (pendingCheckbox) pendingCheckbox.checked = true;
      close();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        close();
      }
    });
  }

  function requireAccepted(checkbox) {
    const el =
      typeof checkbox === "string" ? document.getElementById(checkbox) : checkbox;

    if (!el?.checked) {
      window.showToast?.("Az adatkezelési tájékoztató elfogadása kötelező.", "error");
      return false;
    }
    return true;
  }

  window.PrivacyModal = { init, open, close, requireAccepted };

  document.addEventListener("DOMContentLoaded", init);
})();
