fetch("../components/login.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("login").innerHTML = html;
    initLogin();
  });

function formatName(name) {
  return name
    .trim()
    .split(/\s+/)
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1).toLowerCase()
    )
    .join(" ");
}

function setUserUI(loginBtn, userName) {
  const initials = userName
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase();

  loginBtn.textContent = initials;
  loginBtn.title = `${userName} - Kattintson a kijelentkezéshez`;
}

function initLogin() {
  const modal = document.getElementById("authModal");
  const loginBtn = document.querySelector(".login-btn");
  const closeBtn = document.getElementById("closeAuth");
  const switchBtn = document.getElementById("switchAuth");
  const authTitle = document.getElementById("authTitle");

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const userName = localStorage.getItem("userName");

  if (userName && loginBtn) {
    setUserUI(loginBtn, userName);
  }

  let isLoginMode = true;

  // OPEN
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();

    if (localStorage.getItem("userName")) {
      if (confirm("Kijelentkezik?")) {
        logout();
      }
    } else {
      loginForm.style.display = "flex";
      registerForm.style.display = "none";
      authTitle.textContent = "Bejelentkezés";
      switchBtn.textContent = "Regisztráció";
      isLoginMode = true;

      modal.style.display = "flex";
    }
  });

  // CLOSE
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // SWITCH LOGIN / REGISTER
  switchBtn.addEventListener("click", () => {
  if (isLoginMode) {
    loginForm.style.display = "none";
    registerForm.style.display = "flex";

    authTitle.textContent = "Regisztráció";
    switchBtn.textContent = "Bejelentkezés";
  } else {
    loginForm.style.display = "flex";
    registerForm.style.display = "none";

    authTitle.textContent = "Bejelentkezés";
    switchBtn.textContent = "Regisztráció";
  }

  isLoginMode = !isLoginMode;
});

  // ✅ LOGIN SUBMIT
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email =
      loginForm.querySelector('input[type="email"]').value;

    const password =
      loginForm.querySelector('input[type="password"]').value;

    // MOCK ADMIN LOGIN
    if (
      email === "admin@aranyfakanal.hu" &&
      password === "admin123"
    ) {

      localStorage.setItem("isAdmin", "true");

      window.location.href = "../dashboard/index.html";

      return;
    }

    alert("Hibás bejelentkezés!");
  });

  // ✅ REGISTER SUBMIT
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    let fullName =registerForm.querySelector('input[type="text"]').value;

    fullName = formatName(fullName);

    localStorage.setItem("userName", fullName);

    setUserUI(loginBtn, fullName);

    alert("Sikeres regisztráció!");
    modal.style.display = "none";
  });
}

function logout() {
  localStorage.removeItem("userName");
  localStorage.removeItem("isAdmin");

  location.reload();
}


