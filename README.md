# Arany Fakanál

Éttermi management rendszer (vizsgaremek). A vendégek megnézhetik az étlapot és a heti menüt, asztalt foglalhatnak, ételt rendelhetnek házhoz, és üzenetet küldhetnek. A személyzet a dashboardon kezeli a rendeléseket, foglalásokat, menüt és a beállításokat. A vendégek a saját rendeléseiket és foglalásaikat a vendégközpontban látják.

## Technológia

- Backend: Django 6, Django REST Framework, session alapú bejelentkezés
- Frontend: HTML, CSS, JavaScript (Django sablonok + statikus fájlok)
- Adatbázis: SQLite (`backend/db.sqlite3` — ez a fájl benne van a gitben, mert csak tesztadatokat tartalmaz)

## Főbb funkciók

- Publikus oldalak: főoldal, étlap, asztalfoglalás
- Regisztráció / bejelentkezés
- Szerepkörök: vendég, alkalmazott, admin
- Dashboard: rendelések, foglalások, heti menü, üzenetek, beállítások
- Vendégközpont: saját rendelések és foglalások
- Élő frissítés a nyitott böngészők között

## Követelmények

A gépen elég a **Python 3.12+**.

A Django és a többi szükséges csomag (REST Framework stb.) nem külön telepítendő: az indításnál a `pip install -r backend\requirements.txt` felrakja őket.

## Indítás

```powershell
git clone https://github.com/leviur/Arany-fakanal.git
cd Arany-fakanal

python -m venv venv
.\venv\Scripts\Activate.ps1

pip install -r backend\requirements.txt

cd backend
python manage.py migrate
python manage.py runserver
```

Ezután a böngészőben: http://127.0.0.1:8000/

A gitben lévő adatbázis már tartalmaz tesztadatokat, ezért az indításhoz nem kell fixture-t betölteni.

## Adatbázis és fixture-ek

Az adatbázis most tesztadatokat tárol, ezért a `backend/db.sqlite3` fájl a gitben van.

A projekt arra is fel van készítve, hogy ha később valós adatok lennének az adatbázisban, azokat ne a sqlite fájllal, hanem fixture-rel (JSON mentéssel) lehessen ki- és betölteni.

Adatok kimentése az adatbázisból fájlba:

```powershell
cd backend
python manage.py export_fixtures
```

Adatok feltöltése a fájlból az adatbázisba:

```powershell
cd backend
python manage.py load_fixtures
```

Részletek: [`backend/fixtures/README.md`](backend/fixtures/README.md)

## Tesztelés — belépés

Admin fiók (dashboardhoz):

- email: `admin@aranyfakanal.hu`
- jelszó: `admin123`

Vendég fiók:

- email: `kissanna@gmail.com`
- jelszó: `12345678`

Új felhasználót a belépő ablak **Regisztráció** gombjával is létre lehet hozni.

## Házhoz rendelés a főoldalon

A heti menü rendeléshez **nincs feltöltve**. Emiatt a főoldalon egyelőre nem lehet ételt házhoz rendelni.

Először adminnal (vagy alkalmazottal) lépj be, a dashboardon töltsd fel a heti menüt, és utána működik a házhoz rendelés a főoldalon.

## Oldalak

| Útvonal | Mit nyit meg |
|---------|----------------|
| http://127.0.0.1:8000/ | Főoldal |
| http://127.0.0.1:8000/etlap/ | Étlap |
| http://127.0.0.1:8000/asztalfoglalas/ | Asztalfoglalás |
| http://127.0.0.1:8000/dashboard/ | Személyzeti dashboard |
| http://127.0.0.1:8000/guest-portal/ | Vendégközpont |
| http://127.0.0.1:8000/admin/ | Django admin |

## Mappák

```
Arany-fakanal/
├── backend/          Django projekt, API, sablonok, fixture-ek, adatbázis
├── frontend/         statikus CSS, JS, képek
└── Restaurant Management System - Vizsgaremek dokumentáció.pdf
```

## Dokumentáció

A vizsgaremek leírása PDF-ben a repo gyökerében:

[Restaurant Management System - Vizsgaremek dokumentáció.pdf](Restaurant%20Management%20System%20-%20Vizsgaremek%20dokumentáció.pdf)
