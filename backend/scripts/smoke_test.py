"""Gyors füstteszt — fő oldalak és API végpontok (helyi szerver: localhost:8000)."""
import http.cookiejar
import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0
SKIP = 0


def ok(name):
    global PASS
    PASS += 1
    print(f"  OK   {name}")


def fail(name, detail=""):
    global FAIL
    FAIL += 1
    print(f"  FAIL {name}" + (f" — {detail}" if detail else ""))


def skip(name, reason=""):
    global SKIP
    SKIP += 1
    print(f"  SKIP {name}" + (f" — {reason}" if reason else ""))


def get(opener, path, expected=(200,), name=None):
    name = name or path
    try:
        with opener.open(BASE + path) as resp:
            code = resp.getcode()
            body = resp.read()
            if code in expected:
                ok(name)
                return code, body
            fail(name, f"HTTP {code}, expected {expected}")
            return code, body
    except urllib.error.HTTPError as e:
        if e.code in expected:
            ok(name)
            return e.code, e.read()
        fail(name, f"HTTP {e.code}")
        return e.code, b""
    except urllib.error.URLError as e:
        fail(name, str(e.reason))
        return None, b""


def post_json(opener, path, payload, csrf="", expected=(200, 201), name=None):
    name = name or f"POST {path}"
    data = json.dumps(payload).encode()
    headers = {"Content-Type": "application/json", "Referer": BASE + "/"}
    if csrf:
        headers["X-CSRFToken"] = csrf
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method="POST")
    try:
        with opener.open(req) as resp:
            code = resp.getcode()
            body = resp.read()
            if code in expected:
                ok(name)
                return code, json.loads(body.decode()) if body else {}
            fail(name, f"HTTP {code}")
            return code, {}
    except urllib.error.HTTPError as e:
        if e.code in expected:
            ok(name)
            raw = e.read()
            try:
                return e.code, json.loads(raw.decode())
            except json.JSONDecodeError:
                return e.code, {}
        fail(name, f"HTTP {e.code}: {e.read()[:200]!r}")
        return e.code, {}


def csrf_from(jar):
    for cookie in jar:
        if cookie.name == "csrftoken":
            return cookie.value
    return ""


def main():
    print(f"Füstteszt: {BASE}\n")

    anon = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    # --- Publikus HTML ---
    print("Publikus oldalak:")
    for path in ["/", "/asztalfoglalas/", "/etlap/", "/dashboard/", "/guest-portal/"]:
        get(anon, path, expected=(200, 302), name=path)

    # --- Publikus API ---
    print("\nPublikus API:")
    get(anon, "/api/auth/me/", name="GET /api/auth/me/ (anon)")
    get(anon, "/api/revision/", name="GET /api/revision/")
    code, _ = get(anon, "/api/orders/", expected=(200, 401, 403), name="GET /api/orders/ (anon)")
    code, _ = get(anon, "/api/reservations/", expected=(200, 401, 403), name="GET /api/reservations/ (anon)")

    # --- Vendég login ---
    print("\nVendég (kissanna@gmail.com):")
    guest_jar = http.cookiejar.CookieJar()
    guest = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(guest_jar))
    get(guest, "/api/auth/me/")
    csrf = csrf_from(guest_jar)
    code, user = post_json(
        guest,
        "/api/auth/login/",
        {"email": "kissanna@gmail.com", "password": "12345678"},
        csrf=csrf,
        name="POST login (vendég)",
    )
    if code not in (200, 201):
        skip("Vendég további tesztek", "login sikertelen")
    else:
        ok(f"  user id={user.get('id')}, role={user.get('role')}")
        _, me_body = get(guest, "/api/auth/me/", name="GET /api/auth/me/ (vendég session)")
        if me_body:
            me = json.loads(me_body.decode())
            if not me.get("id"):
                fail("vendég session üres", str(me))

        get(guest, "/api/guest-portal/orders/", name="GET guest-portal orders")
        get(guest, "/api/guest-portal/reservations/", name="GET guest-portal reservations")

    # --- Admin login ---
    print("\nAdmin (admin@aranyfakanal.hu):")
    admin_jar = http.cookiejar.CookieJar()
    admin = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(admin_jar))
    get(admin, "/api/auth/me/")
    csrf = csrf_from(admin_jar)
    code, admin_user = post_json(
        admin,
        "/api/auth/login/",
        {"email": "admin@aranyfakanal.hu", "password": "admin123"},
        csrf=csrf,
        name="POST login (admin)",
    )
    if code not in (200, 201):
        skip("Admin további tesztek", "login sikertelen")
    else:
        ok(f"  role={admin_user.get('role')}")
        code, orders_body = get(admin, "/api/orders/", name="GET /api/orders/ (admin)")
        if orders_body:
            try:
                orders = json.loads(orders_body.decode())
                ok(f"  rendelések: {len(orders)} db")
            except json.JSONDecodeError:
                fail("orders JSON parse")
        code, res_body = get(admin, "/api/reservations/", name="GET /api/reservations/ (admin)")
        if res_body:
            try:
                res = json.loads(res_body.decode())
                ok(f"  foglalások: {len(res)} db")
            except json.JSONDecodeError:
                fail("reservations JSON parse")

    # --- Statikus JS (frissített fájlok) ---
    print("\nStatikus fájlok:")
    for path in [
        "/static/dashboard/js/dashboard.js",
        "/static/dashboard/js/index.js",
        "/static/js/booking-form-prefill.js",
    ]:
        get(anon, path, name=path)

    print(f"\n--- Összesen: {PASS} OK, {FAIL} FAIL, {SKIP} SKIP ---")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
