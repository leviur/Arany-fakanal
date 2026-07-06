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
// Bejelentkezés után: pendingCart (localStorage) hozzáadása a meglévő kosárhoz.
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

        if (typeof setCartUserId === "function") {
            setCartUserId(user.id);
        }

        if (typeof validateCartItems === "function") {
            validateCartItems({ silent: true });
        }

        setUserUI(loginBtn, user.name);

        if (typeof renderCart === "function") {
            renderCart();
        }
    }

    refreshAuthState();

    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (currentUser) {
            const lineCount =
                typeof getCartLineCount === "function" ? getCartLineCount() : 0;
            const message =
                lineCount > 0
                    ? `Kosarában ${lineCount} tétel van — a kosár megmarad bejelentkezés után. Biztosan kijelentkezik?`
                    : "Kijelentkezik?";

            if (confirm(message)) {
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
                window.showToast?.(loginData.detail || "Sikertelen bejelentkezés.", "error");
                return;
            }

            if (isAdminUser(loginData)) {
                const sessionUser = await checkAuthSession();
                if (!sessionUser || sessionUser.role !== "admin") {
                    window.showToast?.(
                        "Bejelentkezés sikeres, de a munkamenet nem jött létre. Próbáld újra.",
                        "error"
                    );
                    return;
                }
                window.location.href = "/dashboard/";
                return;
            }

            currentUser = loginData;
            setUserUI(loginBtn, loginData.name);

            if (typeof setCartUserId === "function") {
                setCartUserId(loginData.id);
            }

            modal.style.display = "none";
            loginForm.reset();
            handlePendingCartItem();

            if (typeof validateCartItems === "function") {
                validateCartItems({ silent: true });
            }
            if (typeof renderCart === "function") {
                renderCart();
            }
            if (typeof window.prefillBookingFormFromUser === "function") {
                window.prefillBookingFormFromUser(loginData);
            }
        } catch (error) {
            console.error("Bejelentkezés sikertelen:", error);
            window.showToast?.("Hiba történt a bejelentkezés során.", "error");
        }
    });

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!window.PrivacyModal?.requireAccepted("register-privacy")) {
            return;
        }

        let fullName = document.getElementById("reg-name").value;
        const email = document.getElementById("reg-email").value;
        const phone = document.getElementById("reg-phone").value;
        const address = document.getElementById("reg-address").value;
        const password = document.getElementById("reg-password").value;
        const passwordConfirm = document.getElementById("reg-password-confirm").value;

        if (password.length < 8) {
            window.showToast?.("A jelszónak legalább 8 karakter hosszúnak kell lennie!", "error");
            return;
        }

        if (password !== passwordConfirm) {
            window.showToast?.("A két jelszó nem egyezik!", "error");
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
                window.showToast?.(message, "error");
                return;
            }

            currentUser = data;
            setUserUI(loginBtn, data.name);
            window.showToast?.("Sikeres regisztráció!", "success");

            if (typeof setCartUserId === "function") {
                setCartUserId(data.id);
            }

            modal.style.display = "none";
            registerForm.reset();
            handlePendingCartItem();

            if (typeof validateCartItems === "function") {
                validateCartItems({ silent: true });
            }
            if (typeof renderCart === "function") {
                renderCart();
            }
            if (typeof window.prefillBookingFormFromUser === "function") {
                window.prefillBookingFormFromUser(data);
            }
        } catch (error) {
            console.error("Regisztráció sikertelen:", error);
            window.showToast?.("Hiba történt a regisztráció során.", "error");
        }
    });
}


// ======================================================
// Kijelentkezés — session törlése a szerveren
// ======================================================
async function logout() {
    try {
        await authRequest("/api/auth/logout/", {
            method: "POST",
        });
    } catch (error) {
        console.error("Kijelentkezés sikertelen:", error);
    }

    // A kosár localStorage-ban megmarad — újra bejelentkezéskor visszatöltődik
    location.reload();
}
