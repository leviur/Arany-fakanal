/**********************
 * toast.js — közös értesítő (jobb alsó sarok)
 *
 * Betöltés: base.html — minden publikus oldalon; dashboard + vendégközpont is
 *
 * Globális: window.showToast(message, type?, options?)
 *
 * Példák:
 *   showToast("Sikeres mentés!", "success");
 *   showToast("Már rendeltél (júl. 15. A) — nem került a kosárba.", "error");
 *   showToast("Tétel törölve", "deleted", {
 *     actionLabel: "Visszavonás",
 *     onAction: () => undoDelete(),
 *   });
 *
 * Típusok: "success" | "error" | "info" | "deleted"  (alapértelmezett: "info")
 **********************/

// Ikonok típusonként 
const TOAST_ICONS = {
  success: "fa-circle-check",
  error: "fa-circle-xmark",
  info: "fa-circle-info",
  deleted: "fa-trash",
};

// Ennyi ms után magától eltűnik 
const TOAST_AUTO_DISMISS_MS = 3500;

window.showToast = function (message, type = "info", options = {}) {
  // Első híváskor létrehozzuk a tárolót (nincs külön HTML sablon)
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  const icon = document.createElement("i");
  icon.className = `fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}`;
  icon.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = message;

  toast.append(icon, text);

  // Opcionális művelet gomb (pl. „Visszavonás” törlés után)
  if (options.actionLabel && options.onAction) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = options.actionLabel;
    toast.appendChild(actionBtn);
  }

  container.appendChild(toast);

  let dismissTimer = setTimeout(dismiss, TOAST_AUTO_DISMISS_MS);

  function dismiss() {
    // toast bezárása
    clearTimeout(dismissTimer); // Ha már manuálisan zárjuk (pl. action gomb miatt), ne fusson le később még egyszer az automata zárás.
    toast.classList.add("toast-out"); // Rátesz egy CSS class-t, amitől elindul a „kicsúszó/eltűnő” animáció (ez a toast.css-ben van).
    toast.addEventListener("animationend", () => toast.remove(), { once: true }); //Nem azonnal törli a DOM-ból, hanem megvárja, míg az animáció lefut, és csak utána szedi ki a toast elemet.
  }

  toast.querySelector(".toast-action")?.addEventListener("click", () => {
    options.onAction();
    dismiss();
  });
};
