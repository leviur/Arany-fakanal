# Adatbázis — fixture betöltés és mentés

A fejlesztői adatok **nem** a `db.sqlite3` fájlban vannak verziókezelve (az a `.gitignore`-ban marad), hanem ebben a mappában lévő JSON fájlokban:

| Fájl | Tartalom |
|------|----------|
| `bootstrap.json` | Étlap, allergének, heti menü, nyitvatartás, SLA, felhasználók + profilok |
| `demo.json` | Teszt rendelések, foglalások, üzenetek |

---

## Új gépen / üres adatbázis feltöltése

A `backend` mappából:

```powershell
cd backend
python manage.py migrate
python manage.py load_fixtures
```

Ez előbb a `bootstrap.json`-t, majd a `demo.json`-t tölti be.

### Csak az étlap és beállítások (demo nélkül)

```powershell
python manage.py migrate
python manage.py load_fixtures --bootstrap-only
```

### Csak a demo adatok (ha a bootstrap már be van töltve)

```powershell
python manage.py load_fixtures --demo-only
```

---

## Meglévő adatbázis felülírása fixture-ből

Ha már van `db.sqlite3`, a betöltés **ütközhet** a meglévő sorokkal. Ilyenkor előbb készíts mentést, majd indulj „tiszta lappal”:

```powershell
cd backend
Copy-Item db.sqlite3 db.sqlite3.bak
Remove-Item db.sqlite3
python manage.py migrate
python manage.py load_fixtures
```

Ha nem jó az eredmény, visszaállítás:

```powershell
Copy-Item db.sqlite3.bak db.sqlite3 -Force
```

---

## Adatok módosítása után — kimentés (export)

Ha az adminban vagy a dashboardon **módosítottál** ételeket, heti menüt, felhasználókat, rendeléseket stb., és ezt meg akarod osztani a csapattal / gitben tartani:

```powershell
cd backend
python manage.py export_fixtures
```

Ez felülírja:

- `fixtures/bootstrap.json`
- `fixtures/demo.json`

Utána commitold a két JSON fájlt (a `db.sqlite3`-at ne).

---

## Mit érdemes gitbe tenni?

| Igen | Nem |
|------|-----|
| `fixtures/bootstrap.json` | `db.sqlite3` |
| `fixtures/demo.json` | `__pycache__/`, `venv/` |

---

## Gyors ellenőrzés betöltés után

```powershell
python manage.py shell -c "from menu.models import MenuItem, WeeklyMenu; from orders.models import Order; from django.contrib.auth import get_user_model; U=get_user_model(); print('étel:', MenuItem.objects.count()); print('heti menü:', WeeklyMenu.objects.count()); print('user:', U.objects.count()); print('rendelés:', Order.objects.count())"
```

A pontos számok a fixture tartalmától függenek; export után ezek frissülnek.

---

## Rövid összefoglaló

| Cél | Parancs |
|-----|---------|
| Betöltés (minden) | `python manage.py load_fixtures` |
| Betöltés (csak étlap) | `python manage.py load_fixtures --bootstrap-only` |
| Kimentés módosítás után | `python manage.py export_fixtures` |

A parancsok forrása: `menu/management/commands/load_fixtures.py` és `export_fixtures.py`.
