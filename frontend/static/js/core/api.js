/**********************
 * core/api.js — közös API hívások
 *
 * Ez a fájl a frontend „közös alapja”: minden fetch (login, contact, guest-portal listák, checkout, stb.) ugyanazt a CSRF + session beállítást kapja.
 * 
 * Minden oldal ezt használja (főoldal, dashboard, vendégközpont).
 * Egy helyen van: cookie olvasás, session cookie küldés, CSRF védelem.
 *
 * Exportált függvények (window.*):
 *   getCookie(name)        — pl. csrftoken olvasása
 *   apiRequest(url, opts)  — POST/PATCH/DELETE + JSON (login, kosár, dashboard…)
 *   checkAuthSession()     — GET /api/auth/me/ → user objektum vagy null
 *
 * Megjegyzés: checkAuthSession nem apiRequest-et hív — egyszerű GET, nincs JSON body.
 **********************/


// Cookie kiolvasása név alapján (pl. "csrftoken")
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";").shift();
    }
    return null;
}


// Központi fetch — így nem kell minden fájlban újra megírni
async function apiRequest(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    // Django POST/PATCH/DELETE kéréseknél kell a CSRF token
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
    }

    return fetch(url, {
        credentials: "include", // küldi a bejelentkezési session cookie-t
        ...options,
        headers,
    });
}


// Be vagyunk-e jelentkezve? Ez egy egyszerű GET: ha nincs session → null; ha van → user objektum
async function checkAuthSession() {
    try {
        const response = await fetch("/api/auth/me/", {
            credentials: "include",
        });

        if (!response.ok) {
            return null;
        }

        const user = await response.json();
        // Nincs session: { authenticated: false }
        return user.id ? user : null;
    } catch (error) {
        console.error("Bejelentkezés ellenőrzése sikertelen:", error);
        return null;
    }
}


// Globálisan elérhető (cart.js, homepage stb. is hívja)
window.getCookie = getCookie;
window.apiRequest = apiRequest;
window.checkAuthSession = checkAuthSession;
