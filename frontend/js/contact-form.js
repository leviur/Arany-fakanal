document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".contact-form-fields");
  if (!form) return;

  const CONTACT_INBOX_KEY = "aranyfakanal_inbox";

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const newMessage = {
      id: Date.now(),
      name: form.querySelector("#contact-name").value.trim(),
      email: form.querySelector("#contact-email").value.trim(),
      subject: form.querySelector("#contact-subject").value.trim(),
      message: form.querySelector("#contact-message").value.trim(),
      type: form.querySelector("#contact-type").value,
      date: formatNow(),
      read: false,
      archived: false,
    };

    const inbox = JSON.parse(localStorage.getItem(CONTACT_INBOX_KEY) || "[]");
    inbox.push(newMessage);
    localStorage.setItem(CONTACT_INBOX_KEY, JSON.stringify(inbox));

    showContactSuccess(form.closest(".contact-form"));
  });

  function formatNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
