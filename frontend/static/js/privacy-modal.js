/**
 * Adatkezelési tájékoztató modal — közös, újrahasznosítható logika.
 *
 * Mire jó?
 * - Több űrlapon is ugyanazt a modalt használjuk (kapcsolat, foglalás, stb.)
 * - A "megnyitás" gomb a checkbox labeljében van, ezért kattintáskor
 *   eltesszük, melyik checkbox tartozik hozzá (pendingCheckbox)
 * - Elfogadásnál bepipáljuk azt a checkboxot, és zárjuk a modalt
 *
 * HTML (base.html): `components/privacy-modal.html`
 * Nyitó gomb: `[data-open-privacy-modal]`
 * Modal: `#privacyModal`, zárás: `#closePrivacyModal`, elfogadás: `#privacyModalAccept`
 */
(function () {
  let modal = null;
  let closeBtn = null;
  let acceptBtn = null;
  let pendingCheckbox = null;
  let initialized = false;

  function open() {
    // Klasszikus "modal open": látható + fókusz + háttér scroll lock
    if (!modal) return;
    modal.removeAttribute("hidden");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  }

  function close() {
    // Visszaállítás: elrejtés + scroll unlock + elfelejtjük, melyik checkbox volt a forrás
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    pendingCheckbox = null;
  }

  function bindOpenTriggers() {
    document.querySelectorAll("[data-open-privacy-modal]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // A gomb a checkbox labeljében van — innen szedjük ki a kapcsolódó inputot
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
      // Elfogadás = checkbox bepipál + zárás
      if (pendingCheckbox) pendingCheckbox.checked = true;
      close();
    });

    modal.addEventListener("click", (e) => {
      // Klikk a háttérre (overlay) zárja
      if (e.target === modal) close();
    });

    document.addEventListener("keydown", (e) => {
      // ESC zárja, ha nyitva van
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        close();
      }
    });
  }

  function requireAccepted(checkbox) {
    // Űrlapok hívják: ha nincs bepipálva, toast + false
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
