/**
 * booking-form-prefill.js — asztalfoglalás űrlap kitöltése bejelentkezett user profiljából
 *
 * HTML: asztalfoglalas.html — #bookingForm (#booking-name, #booking-email, #booking-phone)
 * Adat: GET /api/auth/me/ vagy login/reg válasz (name, email, phone_number)
 *
 * Hívók: login.js → prefillBookingFormFromUser() session frissítés / login / reg után
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  function prefillBookingFormFromUser(user, options = {}) {
    if (!user?.id) return;

    const overwrite = Boolean(options.overwrite);
    const nameEl = form.querySelector("#booking-name");
    const emailEl = form.querySelector("#booking-email");
    const phoneEl = form.querySelector("#booking-phone");
    if (!nameEl || !emailEl || !phoneEl) return;

    if ((overwrite || !nameEl.value.trim()) && user.name) {
      nameEl.value = user.name;
    }
    if ((overwrite || !emailEl.value.trim()) && user.email) {
      emailEl.value = user.email;
    }
    if ((overwrite || !phoneEl.value.trim()) && user.phone_number) {
      phoneEl.value = user.phone_number;
    }
  }

  window.prefillBookingFormFromUser = prefillBookingFormFromUser;

  window.checkAuthSession?.().then((user) => prefillBookingFormFromUser(user));
});
