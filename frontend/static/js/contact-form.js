/**
 * Kapcsolatfelvétel űrlap (homepage) — POST /api/contact/create/
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".contact-form-fields");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const defaultBtnHtml = submitBtn?.innerHTML ?? "Üzenet küldése";
  const privacyCheckbox = form.querySelector("#contact-privacy");

  function prefillContactFormFromUser(user) {
    if (!user?.id) return;

    const nameEl = form.querySelector("#contact-name");
    const emailEl = form.querySelector("#contact-email");
    if (!nameEl || !emailEl) return;

    if (!nameEl.value.trim() && user.name) {
      nameEl.value = user.name;
    }
    if (!emailEl.value.trim() && user.email) {
      emailEl.value = user.email;
    }
  }

  window.prefillContactFormFromUser = prefillContactFormFromUser;
  window.checkAuthSession?.().then(prefillContactFormFromUser);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!window.PrivacyModal?.requireAccepted(privacyCheckbox)) {
      return;
    }

    const payload = {
      name: form.querySelector("#contact-name")?.value.trim() ?? "",
      email: form.querySelector("#contact-email")?.value.trim() ?? "",
      subject: form.querySelector("#contact-subject")?.value.trim() ?? "",
      message: form.querySelector("#contact-message")?.value.trim() ?? "",
      type: form.querySelector("#contact-type")?.value ?? "",
    };

    if (!payload.name || !payload.email || !payload.message || !payload.type) {
      window.showToast?.("Töltsd ki a kötelező mezőket!", "error");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Küldés...";
    }

    try {
      const headers = { "Content-Type": "application/json" };
      const csrfToken = getCookie("csrftoken");
      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }

      const response = await fetch("/api/contact/create/", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw err;
      }

      showContactSuccess(form.closest(".contact-form"));
    } catch (err) {
      console.error("Kapcsolatfelvétel sikertelen:", err);
      const message = formatApiError(err);
      window.showToast?.(message, "error");

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = defaultBtnHtml;
      }
    }
  });

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }
    return null;
  }

  function formatApiError(err) {
    if (!err || typeof err !== "object") {
      return "Az üzenet küldése sikertelen. Próbáld újra később.";
    }
    if (typeof err.detail === "string") {
      return err.detail;
    }
    const parts = [];
    for (const [, messages] of Object.entries(err)) {
      const label = Array.isArray(messages) ? messages.join(" ") : String(messages);
      parts.push(label);
    }
    return parts.length ? parts.join(" ") : "Az üzenet küldése sikertelen.";
  }

  function showContactSuccess(container) {
    if (!container) return;

    container.innerHTML = `
      <div class="contact-success">
        <i class="fa-solid fa-circle-check"></i>
        <h3>Köszönjük, üzenetét megkaptuk!</h3>
        <p>Üzenetét sikeresen elküldte. Hamarosan felvesszük Önnel a kapcsolatot a megadott e-mail címen.</p>
      </div>
    `;
  }
});

