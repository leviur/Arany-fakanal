document.addEventListener("DOMContentLoaded", () => {
    initLogin();
});


// ======================================================
// SESSION AUTH — segédfüggvények
// ======================================================
// Session auth-nál a böngésző automatikusan kezeli a session cookie-t.
// POST kérésekhez viszont kell a CSRF token is (Django védelem).

// Cookie olvasása név alapján (pl. "csrftoken")
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
    return null;
}


// Központi fetch wrapper auth API hívásokhoz.
// - credentials: "include" → a böngésző küldi a session cookie-t
// - X-CSRFToken header → Django CSRF védelem POST kéréseknél
async function authRequest(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
    }

    return fetch(url, {
        credentials: "include",
        ...options,
        headers,
    });
}


// ======================================================
// Session auth állapot lekérdezése
// ======================================================
async function checkAuthSession() {
    try {
        const response = await fetch("/api/auth/me/", {
            credentials: "include",
        });

        if (!response.ok) {
            return null;
        }

        const user = await response.json();
        return user.id ? user : null;
    } catch (error) {
        console.error("Auth állapot lekérdezése sikertelen:", error);
        return null;
    }
}

window.checkAuthSession = checkAuthSession;


function openAuthModal() {
    const modal = document.getElementById("authModal");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const authTitle = document.getElementById("authTitle");
    const switchBtn = document.getElementById("switchAuth");

    if (!modal || !loginForm || !registerForm) {
        return;
    }

    loginForm.style.display = "flex";
    registerForm.style.display = "none";
    if (authTitle) authTitle.textContent = "Bejelentkezés";
    if (switchBtn) switchBtn.textContent = "Regisztráció";
    modal.style.display = "flex";
}

window.openAuthModal = openAuthModal;


// ======================================================
// Függőben lévő kosár tétel folytatása login után
// ======================================================
// Bejelentkezés után: először törlődik a régi kosár (clearCart a hívóban),
// majd ide kerül be a pendingCart, amit a napi menü űrlap mentett el.
function handlePendingCartItem() {
    const pendingCart = localStorage.getItem("pendingCart");

    if (pendingCart && typeof addDailyMenuToCart === "function") {
        const cartData = JSON.parse(pendingCart);
        addDailyMenuToCart(cartData);
        localStorage.removeItem("pendingCart");

        if (typeof renderCart === "function") {
            renderCart();
        }
    }
}


// ======================================================
// Név formázás
// ======================================================
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


// ======================================================
// Profil gomb kinézet
// ======================================================
function setUserUI(loginBtn, userName) {
    if (!loginBtn) return;

    const initials = userName
        .split(" ")
        .map(word => word[0])
        .join("")
        .toUpperCase();

    loginBtn.textContent = initials;
    loginBtn.title = `${userName} - Kattintson a kijelentkezéshez`;
}


function clearUserUI(loginBtn) {
    if (!loginBtn) return;

    loginBtn.innerHTML = '<i class="fa-regular fa-user"></i>';
    loginBtn.title = "Profil";
}


function isAdminUser(user) {
    // Csak a UserProfile.role === "admin" felhasználó (pl. admin@aranyfakanal.hu)
    return user.role === "admin";
}


// ======================================================
// Login rendszer
// ======================================================
function initLogin() {
    const modal = document.getElementById("authModal");
    const loginBtn = document.querySelector(".login-btn");
    const closeBtn = document.getElementById("closeAuth");
    const switchBtn = document.getElementById("switchAuth");
    const authTitle = document.getElementById("authTitle");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (!modal || !loginBtn) {
        return;
    }

    // Memóriában tároljuk a bejelentkezett usert (nem localStorage-ban!)
    let currentUser = null;
    let isLoginMode = true;

    // Oldal betöltéskor: ellenőrizzük, van-e aktív session a szerveren
    async function refreshAuthState() {
        const user = await checkAuthSession();

        if (!user) {
            clearUserUI(loginBtn);
            currentUser = null;

            // Nincs bejelentkezve → kosár nem látható (üres marad)
            if (typeof setCartUserId === "function") {
                setCartUserId(null);
            }
            if (typeof renderCart === "function") {
                renderCart();
            }
            return;
        }

        currentUser = user;

        // Bejelentkezett user ID beállítása a kosárhoz
        if (typeof setCartUserId === "function") {
            setCartUserId(user.id);
        }

        setUserUI(loginBtn, user.name);
    }

    refreshAuthState();

    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (currentUser) {
            if (confirm("Kijelentkezik?")) {
                logout();
            }
            return;
        }

        loginForm.style.display = "flex";
        registerForm.style.display = "none";
        authTitle.textContent = "Bejelentkezés";
        switchBtn.textContent = "Regisztráció";
        isLoginMode = true;
        modal.style.display = "flex";
    });

    closeBtn?.addEventListener("click", () => {
        modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });

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

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        try {
            // API hívás → szerver ellenőrzi a jelszót és létrehozza a session-t
            const response = await authRequest("/api/auth/login/", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            const raw = await response.text();

            console.log("LOGIN SERVER RESPONSE:", raw);

            let loginData;

            try {
                loginData = JSON.parse(raw);
            } catch (err) {
                throw new Error("A szerver nem JSON választ adott.");
            }
            

            if (!response.ok) {
                alert(loginData.detail || "Sikertelen bejelentkezés.");
                return;
            }

            if (isAdminUser(loginData)) {
                // Admin felhasználó → dashboard oldalra irányítás
                window.location.href = "/dashboard/";
                return;
            }

            currentUser = loginData;
            setUserUI(loginBtn, loginData.name);

            // Bejelentkezéskor a régi kosár törlődik, csak a pendingCart maradhat
            if (typeof setCartUserId === "function") {
                setCartUserId(loginData.id);
            }
            if (typeof clearCart === "function") {
                clearCart();
            }

            modal.style.display = "none";
            loginForm.reset();
            handlePendingCartItem();
        } catch (error) {
            console.error("Bejelentkezés sikertelen:", error);
            alert("Hiba történt a bejelentkezés során.");
        }
    });

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        let fullName = document.getElementById("reg-name").value;
        const email = document.getElementById("reg-email").value;
        const phone = document.getElementById("reg-phone").value;
        const address = document.getElementById("reg-address").value;
        const password = document.getElementById("reg-password").value;
        const passwordConfirm = document.getElementById("reg-password-confirm").value;

        if (password !== passwordConfirm) {
            alert("A két jelszó nem egyezik!");
            return;
        }

        fullName = formatName(fullName);

        try {
            // API hívás → User + UserProfile létrehozása, majd automatikus bejelentkezés
            const response = await authRequest("/api/auth/register/", {
                method: "POST",
                body: JSON.stringify({
                    name: fullName,
                    email,
                    phone,
                    address,
                    password,
                    password_confirm: passwordConfirm,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const firstError = Object.values(data)[0];
                const message = Array.isArray(firstError)
                    ? firstError[0]
                    : (data.detail || "Sikertelen regisztráció.");
                alert(message);
                return;
            }

            currentUser = data;
            setUserUI(loginBtn, data.name);
            alert("Sikeres regisztráció!");

            // Regisztráció után is üres kosárral indul, majd pendingCart hozzáadása
            if (typeof setCartUserId === "function") {
                setCartUserId(data.id);
            }
            if (typeof clearCart === "function") {
                clearCart();
            }

            modal.style.display = "none";
            registerForm.reset();
            handlePendingCartItem();
        } catch (error) {
            console.error("Regisztráció sikertelen:", error);
            alert("Hiba történt a regisztráció során.");
        }
    });
}


// ======================================================
// Kijelentkezés — session törlése a szerveren
// ======================================================
async function logout() {
    try {
        // POST /api/auth/logout/ → Django logout() törli a session-t
        await authRequest("/api/auth/logout/", {
            method: "POST",
        });
    } catch (error) {
        console.error("Kijelentkezés sikertelen:", error);
    }

    // Kijelentkezéskor a kosár tartalma törlődik
    if (typeof clearCart === "function") {
        clearCart();
    }

    location.reload();
}
