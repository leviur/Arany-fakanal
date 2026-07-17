/**
 * login.js — főoldal (és publikus oldalak) bejelentkezés + profil menü
 *
 * HTML: components/login.html (auth modál), components/profile-panel.html (navbar menü)
 * Függőség: core/api.js (apiRequest, checkAuthSession) -  A tényleges API hívások az core/api.js-ben vannak.
 *
 * Fő részek:
 *  1. Auth modál — bejelentkezés / regisztráció (POST /api/auth/login|register/)
 *  2. Profil menü — bejelentkezett user: link a vendégközpontra (/guest-portal/) vagy dashboardra
 *  3. Session — oldal betöltéskor GET /api/auth/me/, kosár user-id szinkron
 *
 * Globális: openAuthModal() — a homepage hívja, ha vendég bejelentkezés nélkül kosárba tenni akar
 */

document.addEventListener("DOMContentLoaded", () => {
    initLogin();
});

// --- Navbar profil menü (lenyíló panel — nem a /guest-portal/ oldal) ---
const PROFILE_PANEL_CLOSE_MS = 280;   // Profil panel bezárási animáció (ms)
const PROFILE_IDLE_CLOSE_MS = 6000;   // ennyi inaktivitás után magától bezáródik
const PROFILE_COMPACT_MQ = window.matchMedia("(max-width: 992px)"); // mobil + tablet nézet


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


// Vendég rendelni akart bejelentkezés nélkül → a kosár adatai pendingCart-ként mentve,
// sikeres login/reg után visszakerülnek a kosárba (homepage heti menü gomb).
async function handlePendingCartItem() {
    const pendingCart = localStorage.getItem("pendingCart");

    if (pendingCart && typeof addDailyMenuToCart === "function") {
        const cartData = JSON.parse(pendingCart);
        await addDailyMenuToCart(cartData);
        localStorage.removeItem("pendingCart");

        if (typeof renderCart === "function") {
            renderCart();
        }
    }
}


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


function getInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
}


function setUserUI(profileEls, user) {
    if (!profileEls?.btn || !user) return;

    const isAdmin = user.role === "admin";
    const displayName = isAdmin ? "Admin" : user.name;
    const initials = isAdmin ? "A" : getInitials(user.name);

    profileEls.btnInner.textContent = initials;
    profileEls.btn.classList.add("profile-menu-btn--logged-in");
    profileEls.menu?.classList.add("profile-menu--logged-in");
    profileEls.chevron?.removeAttribute("hidden");

    if (profileEls.panelAvatar) profileEls.panelAvatar.textContent = initials;
    if (profileEls.panelName) profileEls.panelName.textContent = displayName;
    if (profileEls.panelEmail) profileEls.panelEmail.textContent = user.email || "";

    if (isAdmin) {
        profileEls.linkLabel.textContent = "Admin felület";
        profileEls.link.href = "/dashboard/";
        profileEls.linkIcon.className = "fa-solid fa-gauge-high profile-panel-item-icon";
    } else {
        profileEls.linkLabel.textContent = "Vendégközpont";
        profileEls.link.href = "/guest-portal/";
        profileEls.linkIcon.className = "fa-regular fa-user profile-panel-item-icon";
    }

    profileEls.btn.setAttribute(
        "aria-label",
        isAdmin ? "Admin felület — menü" : `${displayName} — menü`,
    );
}


function clearUserUI(profileEls) {
    if (!profileEls?.btn) return;

    profileEls.btnInner.innerHTML = '<i class="fa-regular fa-user" aria-hidden="true"></i>';
    profileEls.btn.classList.remove("profile-menu-btn--logged-in");
    profileEls.menu?.classList.remove("profile-menu--logged-in");
    profileEls.chevron?.setAttribute("hidden", "");
    profileEls.btn.setAttribute("aria-label", "Profil");
}


function isAdminUser(user) {
    return user.role === "admin";
}


function initLogin() {
    // --- DOM: auth modál + navbar profil panel elemek ---
    const modal = document.getElementById("authModal");
    const profileEls = {
        menu: document.getElementById("profileMenu"),
        btn: document.getElementById("profileMenuBtn"),
        btnInner: document.getElementById("profileMenuBtnInner"),
        chevron: document.getElementById("profileMenuChevron"),
        overlay: document.getElementById("profileMenuOverlay"),
        panel: document.getElementById("profileDropdown"),
        panelClose: document.getElementById("profilePanelClose"),
        panelAvatar: document.getElementById("profilePanelAvatar"),
        panelName: document.getElementById("profilePanelName"),
        panelEmail: document.getElementById("profilePanelEmail"),
        link: document.getElementById("guestPortalLink"),
        linkLabel: document.getElementById("guestPortalLinkLabel"),
        linkIcon: document.getElementById("guestPortalLinkIcon"),
        logoutBtn: document.getElementById("profileLogoutBtn"),
    };

    const closeBtn = document.getElementById("closeAuth");
    const switchBtn = document.getElementById("switchAuth");
    const authTitle = document.getElementById("authTitle");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (!modal || !profileEls.btn) {
        return;
    }

    let currentUser = null;
    let isLoginMode = true;
    let profileMenuOpen = false;
    let profileCloseTimer = null;
    let profileIdleTimer = null;

    // --- Profil menü: nyitás, bezárás, pozíció (mobil sheet / desktop dropdown) ---

    function isCompactProfile() {
        return PROFILE_COMPACT_MQ.matches;
    }

    // Leállítja az „idő múlva bezáródik” időzítőt
    function clearProfileIdleTimer() {
        if (profileIdleTimer) {
            clearTimeout(profileIdleTimer);
            profileIdleTimer = null;
        }
    }

    // Újraindítja: ha nem nyúlsz a profil menühöz, PROFILE_IDLE_CLOSE_MS múlva bezár
    function scheduleProfileIdleClose() {
        clearProfileIdleTimer();
        if (!profileMenuOpen) return;

        profileIdleTimer = setTimeout(() => {
            if (profileMenuOpen) {
                closeProfileMenu();
            }
        }, PROFILE_IDLE_CLOSE_MS);
    }

    function unlockProfileSheet() {
        document.body.classList.remove("profile-sheet-open");
    }

    // A profil panel a navbar gomb alá (vagy fölé) kerül — mobilon és desktopon is
    function positionProfilePanel() {
        if (!profileEls.btn || !profileEls.panel) {
            return;
        }

        const rect = profileEls.btn.getBoundingClientRect();
        const panelHeight = profileEls.panel.offsetHeight || 260;
        const gap = 12;
        let top = rect.bottom + gap;
        let openAbove = false;

        if (top + panelHeight > window.innerHeight - 12 && rect.top > panelHeight + gap) {
            top = rect.top - panelHeight - gap;
            openAbove = true;
        }

        top = Math.max(12, top);

        profileEls.panel.classList.toggle("profile-panel--above", openAbove);

        if (isCompactProfile()) {
            // Mobil + tablet: navbar szélességű, középre (94% vagy görgetve 100%)
            const navbar = document.querySelector(".navbar");
            const navbarScrolled = navbar?.classList.contains("scrolled");
            const vw = window.innerWidth;
            const left = navbarScrolled ? 0 : vw * 0.03;
            const width = navbarScrolled ? vw : vw * 0.94;

            profileEls.panel.classList.toggle("profile-panel--navbar-scrolled", navbarScrolled);
            profileEls.panel.classList.toggle("profile-panel--navbar-float", !navbarScrolled);
            profileEls.panel.style.setProperty("--profile-panel-left", `${left}px`);
            profileEls.panel.style.setProperty("--profile-panel-width", `${width}px`);
            profileEls.panel.style.removeProperty("--profile-panel-right");
        } else {
            // Desktop: keskeny panel, jobbra a gomb alá
            const panelWidth = Math.min(300, window.innerWidth - 24);
            let right = Math.max(12, window.innerWidth - rect.right);

            if (right + panelWidth > window.innerWidth - 12) {
                right = Math.max(12, window.innerWidth - panelWidth - 12);
            }

            profileEls.panel.classList.remove(
                "profile-panel--navbar-scrolled",
                "profile-panel--navbar-float"
            );
            profileEls.panel.style.setProperty("--profile-panel-top", `${top}px`);
            profileEls.panel.style.setProperty("--profile-panel-right", `${right}px`);
            profileEls.panel.style.setProperty("--profile-panel-width", `${panelWidth}px`);
            profileEls.panel.style.removeProperty("--profile-panel-left");
        }

        profileEls.panel.style.setProperty("--profile-panel-top", `${top}px`);
    }

    // Profil panel összecsukása (animáció után elrejtjük a DOM-ból)
    function closeProfileMenu() {
        if (!profileEls.panel || !profileMenuOpen) return;

        profileMenuOpen = false;
        clearProfileIdleTimer();
        profileEls.menu?.classList.remove("is-open");
        profileEls.btn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("profile-menu-open");
        unlockProfileSheet();

        clearTimeout(profileCloseTimer);
        profileCloseTimer = setTimeout(() => {
            if (!profileMenuOpen) {
                profileEls.panel.hidden = true;
                if (profileEls.overlay) profileEls.overlay.hidden = true;
            }
        }, PROFILE_PANEL_CLOSE_MS);
    }

    function openProfileMenu() {
        if (!currentUser || !profileEls.panel) return;

        clearTimeout(profileCloseTimer);
        profileEls.panel.hidden = false;
        if (profileEls.overlay) profileEls.overlay.hidden = false;

        positionProfilePanel();

        requestAnimationFrame(() => {
            profileMenuOpen = true;
            profileEls.menu?.classList.add("is-open");
            profileEls.btn.setAttribute("aria-expanded", "true");
            document.body.classList.add("profile-menu-open");
            // Pontos pozíció a megjelenés után
            requestAnimationFrame(() => {
                positionProfilePanel();
                scheduleProfileIdleClose();
            });
        });
    }

    function toggleProfileMenu() {
        if (profileMenuOpen) {
            closeProfileMenu();
        } else {
            openProfileMenu();
        }
    }

    function confirmLogout() {
        const lineCount =
            typeof getCartLineCount === "function" ? getCartLineCount() : 0;
        const message =
            lineCount > 0
                ? `Kosarában ${lineCount} tétel van — a kosár megmarad bejelentkezés után. Biztosan kijelentkezik?`
                : "Kijelentkezik?";

        if (confirm(message)) {
            logout();
        }
    }

    // --- Session ellenőrzés oldal betöltéskor + kosár szinkron ---
    async function refreshAuthState() {
        const user = await checkAuthSession();

        if (!user) {
            clearUserUI(profileEls);
            currentUser = null;
            closeProfileMenu();

            if (typeof setCartUserId === "function") {
                setCartUserId(null);
            }
            if (typeof clearActiveOrderSlots === "function") {
                clearActiveOrderSlots();
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

        if (typeof refreshActiveOrderSlots === "function") {
            await refreshActiveOrderSlots();
        }

        if (typeof validateCartItems === "function") {
            validateCartItems({ silent: true });
        }

        setUserUI(profileEls, user);

        if (typeof renderCart === "function") {
            renderCart();
        }

        if (typeof window.prefillBookingFormFromUser === "function") {
            window.prefillBookingFormFromUser(user);
        }
        if (typeof window.prefillContactFormFromUser === "function") {
            window.prefillContactFormFromUser(user);
        }
    }

    refreshAuthState();

    // --- Események: profil gomb, menü bezárás, auth modál ---

    profileEls.btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (currentUser) {
            toggleProfileMenu();
            return;
        }

        closeProfileMenu();

        loginForm.style.display = "flex";
        registerForm.style.display = "none";
        authTitle.textContent = "Bejelentkezés";
        switchBtn.textContent = "Regisztráció";
        isLoginMode = true;
        modal.style.display = "flex";
    });

    profileEls.logoutBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        closeProfileMenu();
        confirmLogout();
    });

    profileEls.link?.addEventListener("click", () => {
        closeProfileMenu();
    });

    profileEls.overlay?.addEventListener("click", () => {
        closeProfileMenu();
    });

    profileEls.panelClose?.addEventListener("click", () => {
        closeProfileMenu();
    });

    // Kattintás a profil panelen → újraindul az automatikus bezárás időzítője
    profileEls.panel?.addEventListener("pointerdown", scheduleProfileIdleClose);
    profileEls.panel?.addEventListener("focusin", scheduleProfileIdleClose);

    // Desktop: kívül kattintásra bezár (mobilon/tableten az overlay intézi)
    document.addEventListener("click", (e) => {
        if (!profileMenuOpen || isCompactProfile()) return;

        const target = e.target;
        const clickedInside =
            profileEls.menu?.contains(target) ||
            profileEls.panel?.contains(target) ||
            profileEls.btn?.contains(target);

        if (!clickedInside) {
            closeProfileMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (profileMenuOpen) {
            positionProfilePanel();
        }
    });

    // Oldal görgetésekor bezáródik a profil menü
    window.addEventListener("scroll", () => {
        if (profileMenuOpen) {
            closeProfileMenu();
        }
    }, { passive: true });

    // Escape billentyű
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && profileMenuOpen) {
            closeProfileMenu();
        }
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

    // --- Bejelentkezés: POST /api/auth/login/ → session cookie, UI frissítés ---
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        if (!email) {
            window.showToast?.("Kérem adja meg az e-mail címet!", "error");
            return;
        }

        if (!password) {
            window.showToast?.("Kérem adja meg a jelszót!", "error");
            return;
        }

        try {
            const response = await apiRequest("/api/auth/login/", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            const raw = await response.text();

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
                // Dupla ellenőrzés: a login válasz admin, de a session cookie is kell a dashboardhoz
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
            setUserUI(profileEls, loginData);

            if (typeof setCartUserId === "function") {
                setCartUserId(loginData.id);
            }

            modal.style.display = "none";
            loginForm.reset();

            if (typeof refreshActiveOrderSlots === "function") {
                await refreshActiveOrderSlots();
            }

            await handlePendingCartItem();

            if (typeof validateCartItems === "function") {
                validateCartItems({ silent: true });
            }
            if (typeof renderCart === "function") {
                renderCart();
            }
            if (typeof window.prefillBookingFormFromUser === "function") {
                window.prefillBookingFormFromUser(loginData, { overwrite: true });
            }
            if (typeof window.prefillContactFormFromUser === "function") {
                window.prefillContactFormFromUser(loginData);
            }
        } catch (error) {
            console.error("Bejelentkezés sikertelen:", error);
            window.showToast?.("Hiba történt a bejelentkezés során.", "error");
        }
    });

    // --- Regisztráció: POST /api/auth/register/ → automatikus bejelentkezés ---
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        let fullName = document.getElementById("reg-name").value.trim();
        const email = document.getElementById("reg-email").value.trim();
        const phone = document.getElementById("reg-phone").value.trim();
        const address = document.getElementById("reg-address").value.trim();
        const password = document.getElementById("reg-password").value;
        const passwordConfirm = document.getElementById("reg-password-confirm").value;

        if (!fullName) {
            window.showToast?.("Kérem adja meg a teljes nevet!", "error");
            return;
        }

        if (!email) {
            window.showToast?.("Kérem adja meg az e-mail címet!", "error");
            return;
        }

        if (!phone) {
            window.showToast?.("Kérem adja meg a telefonszámot!", "error");
            return;
        }

        if (!address) {
            window.showToast?.("Kérem adja meg a szállítási címet!", "error");
            return;
        }

        if (!password) {
            window.showToast?.("Kérem adja meg a jelszót!", "error");
            return;
        }

        if (!passwordConfirm) {
            window.showToast?.("Kérem erősítse meg a jelszót!", "error");
            return;
        }

        if (password.length < 8) {
            window.showToast?.("A jelszónak legalább 8 karakter hosszúnak kell lennie!", "error");
            return;
        }

        if (password !== passwordConfirm) {
            window.showToast?.("A két jelszó nem egyezik!", "error");
            return;
        }

        if (!window.PrivacyModal?.requireAccepted("register-privacy")) {
            return;
        }

        fullName = formatName(fullName);

        try {
            const response = await apiRequest("/api/auth/register/", {
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
            setUserUI(profileEls, data);
            window.showToast?.("Sikeres regisztráció!", "success");

            if (typeof setCartUserId === "function") {
                setCartUserId(data.id);
            }

            modal.style.display = "none";
            registerForm.reset();

            if (typeof refreshActiveOrderSlots === "function") {
                await refreshActiveOrderSlots();
            }

            await handlePendingCartItem();

            if (typeof validateCartItems === "function") {
                validateCartItems({ silent: true });
            }
            if (typeof renderCart === "function") {
                renderCart();
            }
            if (typeof window.prefillBookingFormFromUser === "function") {
                window.prefillBookingFormFromUser(data, { overwrite: true });
            }
            if (typeof window.prefillContactFormFromUser === "function") {
                window.prefillContactFormFromUser(data);
            }
        } catch (error) {
            console.error("Regisztráció sikertelen:", error);
            window.showToast?.("Hiba történt a regisztráció során.", "error");
        }
    });
}


// POST /api/auth/logout/ → teljes oldal újratöltés (session + UI tiszta állapot)
async function logout() {
    try {
        await apiRequest("/api/auth/logout/", {
            method: "POST",
        });
    } catch (error) {
        console.error("Kijelentkezés sikertelen:", error);
    }

    location.reload();
}
