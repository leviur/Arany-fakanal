/**
 * contact-form.js — főoldal kapcsolatfelvételi űrlap
 * 
 * * Összegyűjti a mezőket, ellenőrzi őket, elküldi a szervernek, siker esetén köszönő üzenetet mutat 
 *
 * HTML: homepage.html — .contact-form-fields (#contact-name, #contact-email, …)
 * Függőség: core/api.js (apiRequest), privacy-modal.js (adatkezelési pipa ellenőrzés, tájékoztató megnyitása)
 * Backend: POST /api/contact/create/ → ContactMessage (dashboard Üzenetek)
 *
 * Hívók: login.js → prefillContactFormFromUser() login/reg után
 */
document.addEventListener("DOMContentLoaded", () => {  const form = document.querySelector(".contact-form-fields");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const defaultBtnHtml = submitBtn?.innerHTML ?? "Üzenet küldése";
  const privacyCheckbox = form.querySelector("#contact-privacy");

  // --- Bejelentkezett user: név + e-mail előtöltése (session nem kötelező a küldéshez) ---
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

  // --- Küldés: adatkezelés → validáció → POST /api/contact/create/ ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!window.PrivacyModal?.requireAccepted(privacyCheckbox)) {
      return;
    }

    // Publikus endpoint — bejelentkezés nélkül is küldhető
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
      const response = await apiRequest("/api/contact/create/", {
        method: "POST",
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

  // Django REST hibák: { detail: "..." } vagy mezőnkénti üzenetlista
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

  // Siker után az űrlap helyett fix köszönő blokk (nincs „új üzenet” gomb)
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

