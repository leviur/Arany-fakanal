/**********************
 * 🔔 TOAST MODUL
 * Közös értesítő komponens — publikus oldalak és a dashboard is ezt használja.
 **********************/
window.showToast = function(message, type = "info", options = {}) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const icons = { success: "fa-circle-check", error: "fa-circle-xmark", info: "fa-circle-info", deleted: "fa-trash" };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;

  if (options.actionLabel && options.onAction) {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = options.actionLabel;
    toast.appendChild(actionBtn);
  }

  container.appendChild(toast);

  let dismissTimer = setTimeout(dismiss, 3500);

  function dismiss() {
    clearTimeout(dismissTimer);
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }

  toast.querySelector(".toast-action")?.addEventListener("click", () => {
    options.onAction();
    dismiss();
  });
};
