"""
Heti menü API nézetek (views).

Adatmodell emlékeztető (menu/models.py):
  - WeeklyMenuItem  → újrafelhasználható katalógus-tétel (leves / főétel / desszert név)
  - WeeklyMenu      → konkrét napi menü (dátum + A/B + ár + 3 db FK a tételekre)

A Django REST Framework generics.*APIView osztályok maguk végzik az adatbázis-műveletet:
  - ListAPIView   → SELECT (queryset)
  - CreateAPIView → INSERT (serializer.save())
  - RetrieveUpdateDestroyAPIView → SELECT egy rekord / UPDATE / DELETE
"""

from datetime import date, datetime, timedelta

from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from orders.models import OrderItem
from orders.permissions import IsAppAdmin
from users.permissions import is_app_admin

from .models import Allergen, Category, MenuItem, WeeklyMenu, WeeklyMenuItem
from .serializers import (
    CategorySerializer,
    MenuItemSerializer,
    MenuItemWriteSerializer,
    WeeklyMenuItemSerializer,
    WeeklyMenuSerializer,
    WeeklyMenuWriteSerializer,
    AllergenSerializer,
)


def get_order_week_monday(reference_date=None):
    """Ugyanaz a logika, mint a frontend getOrderWeekMonday — péntektől következő hét."""
    if reference_date is None:
        reference_date = date.today()
    dow = reference_date.weekday()  # hétfő=0 … vasárnap=6
    monday = reference_date - timedelta(days=dow)
    if dow >= 4:  # péntek, szombat, vasárnap
        monday += timedelta(days=7)
    return monday


def is_locked_weekly_menu_week(menu_day):
    """True, ha a menü hete már nem szerkeszthető (a rendelési hétnél korábbi)."""
    if isinstance(menu_day, str):
        menu_day = datetime.strptime(menu_day, "%Y-%m-%d").date()
    week_monday = menu_day - timedelta(days=menu_day.weekday())
    return week_monday < get_order_week_monday()


class AllergenListAPIView(generics.ListAPIView):
    """GET /api/allergens/ — allergén lista (dashboard jelölőnégyzet)."""

    queryset = Allergen.objects.all().order_by("name")
    serializer_class = AllergenSerializer
    permission_classes = [AllowAny]


class CategoryListAPIView(generics.ListAPIView):
    """GET /api/categories/ — étlap kategóriák (Category tábla)."""

    queryset = Category.objects.all().order_by("id")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class CategoryCreateAPIView(generics.CreateAPIView):
    """POST /api/categories/create/ — új kategória (admin)."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAppAdmin]


class CategoryDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH / DELETE /api/categories/<id>/ — kategória szerkesztés / törlés (admin)."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAppAdmin]


class MenuItemListAPIView(generics.ListAPIView):
    """GET /api/menu/ — étlap tételek. Admin: mind; vendég: csak elérhető."""

    serializer_class = MenuItemSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = (
            MenuItem.objects.select_related("category")
            .prefetch_related("allergens")
            .order_by("category_id", "id")
        )
        if not is_app_admin(self.request.user):
            queryset = queryset.filter(is_available=True)
        return queryset


class MenuItemCreateAPIView(generics.CreateAPIView):
    """POST /api/menu/create/ — új étel (admin)."""

    queryset = MenuItem.objects.all()
    serializer_class = MenuItemWriteSerializer
    permission_classes = [IsAppAdmin]


class MenuItemDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE /api/menu/<id>/ — egy étel (admin)."""

    queryset = MenuItem.objects.select_related("category").prefetch_related("allergens")
    permission_classes = [IsAppAdmin]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return MenuItemWriteSerializer
        return MenuItemSerializer


class WeeklyMenuListAPIView(generics.ListAPIView):
    """
  GET /api/weekly-menu/?week_start=2026-07-07

  Adatbázis: WeeklyMenu tábla olvasása (SELECT), a kapcsolt tételekkel együtt.
  select_related() → egy SQL-lel hozza a soup / main_course / dessert sorokat is
  (külön SELECT helyett, gyorsabb).

  A válasz JSON-ban a tételek beágyazva jönnek (WeeklyMenuSerializer).
  """

    serializer_class = WeeklyMenuSerializer

    def get_permissions(self):
        # Publikus olvasás (később a főoldal is innen tölthet)
        return [AllowAny()]

    def get_queryset(self):
        # 1) Alap lekérdezés: minden WeeklyMenu + kapcsolt WeeklyMenuItem
        queryset = (
            WeeklyMenu.objects.select_related("soup", "main_course", "dessert")
            .order_by("day", "menu_type")
        )

        # 2) Vendég csak az elérhető menüket látja; admin mindet
        if not is_app_admin(self.request.user):
            queryset = queryset.filter(is_available=True)

        # 3) Opcionális szűrés: csak egy adott hét (hétfő–péntek)
        #    A dashboard a aktuális hét hétfőjét küldi week_start paraméterben.
        week_start = self.request.query_params.get("week_start")
        if week_start:
            try:
                start = datetime.strptime(week_start, "%Y-%m-%d").date()
            except ValueError:
                return queryset.none()
            end = start + timedelta(days=4)  # péntek = hétfő + 4 nap
            queryset = queryset.filter(day__gte=start, day__lte=end)

        return queryset


class WeeklyMenuCreateAPIView(generics.CreateAPIView):
    """
  POST /api/weekly-menu/create/

  Adatbázis: új WeeklyMenu sor INSERT.
  A kérés törzse (JSON) példa:
    {
      "day": "2026-07-07",
      "menu_type": "A",
      "soup": 7,              ← WeeklyMenuItem.id (FK)
      "main_course": 8,
      "dessert": 9,
      "price": "1500.00",
      "is_available": true
    }
  A serializer a számokat automatikusan WeeklyMenuItem objektumokra oldja fel.
  """

    queryset = WeeklyMenu.objects.all()
    serializer_class = WeeklyMenuWriteSerializer
    permission_classes = [IsAppAdmin]

    def create(self, request, *args, **kwargs):
        """
        Soft delete miatt előfordulhat, hogy (day, menu_type) pár már létezik
        is_available=False állapotban. Ilyenkor ne új sort próbáljunk INSERT-elni
        (unique_together hiba), hanem a meglévőt frissítsük és aktiváljuk vissza.
        """
        day = request.data.get("day")
        menu_type = request.data.get("menu_type")

        if day:
            try:
                day_date = datetime.strptime(day, "%Y-%m-%d").date()
            except ValueError:
                pass
            else:
                if is_locked_weekly_menu_week(day_date):
                    return Response(
                        {"detail": "Ez a hét már nem szerkeszthető."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

        if day and menu_type:
            existing = WeeklyMenu.objects.filter(day=day, menu_type=menu_type).first()
            if existing:
                serializer = self.get_serializer(existing, data=request.data, partial=False)
                serializer.is_valid(raise_exception=True)
                serializer.save(is_available=True)
                return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)


class WeeklyMenuDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
  GET    /api/weekly-menu/<id>/  → egy menü olvasása (SELECT)
  PATCH  /api/weekly-menu/<id>/  → mezők frissítése (UPDATE)
  DELETE /api/weekly-menu/<id>/  → sor törlése (DELETE)

  A dashboard szerkesztéskor PATCH-et küld (ha már van id),
  új napi menünél POST create/ végpontot használ.
  """

    queryset = WeeklyMenu.objects.all()
    permission_classes = [IsAppAdmin]

    def get_serializer_class(self):
        # Olvasás: beágyazott tételek (WeeklyMenuSerializer)
        # Írás: csak id-k / egyszerű mezők (WeeklyMenuWriteSerializer)
        if self.request.method in ("PUT", "PATCH"):
            return WeeklyMenuWriteSerializer
        return WeeklyMenuSerializer

    def perform_update(self, serializer):
        menu = self.get_object()
        target_day = serializer.validated_data.get("day", menu.day)
        if is_locked_weekly_menu_week(target_day):
            raise PermissionDenied("Ez a hét már nem szerkeszthető.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """
        Heti menü törlése:
        - ha nincs rendelés rá, marad a fizikai DELETE
        - ha már van OrderItem hivatkozás, soft delete (is_available=False)
        """
        menu = self.get_object()
        if is_locked_weekly_menu_week(menu.day):
            return Response(
                {"detail": "Ez a hét már nem szerkeszthető."},
                status=status.HTTP_403_FORBIDDEN,
            )

        has_orders = OrderItem.objects.filter(weekly_menu=menu).exists()

        if has_orders:
            # Rendelési előzmény miatt a rekordot megtartjuk, csak kivonjuk a kínálatból.
            if menu.is_available:
                menu.is_available = False
                menu.save(update_fields=["is_available"])
            return Response(
                {
                    "detail": "A menüre már érkezett rendelés, ezért kivettük a kínálatból.",
                    "soft_deleted": True,
                },
                status=status.HTTP_200_OK,
            )

        return super().destroy(request, *args, **kwargs)


class WeeklyMenuItemListAPIView(generics.ListAPIView):
    """
  GET /api/weekly-menu-items/
  GET /api/weekly-menu-items/?category=soup

  Adatbázis: WeeklyMenuItem tábla olvasása (SELECT).
  Ezek a „katalógus” tételek — a legördülő listából választunk belőlük.
  """

    serializer_class = WeeklyMenuItemSerializer

    def get_permissions(self):
        return [AllowAny()]

    def get_queryset(self):
        queryset = WeeklyMenuItem.objects.all().order_by("category", "name")

        # Vendég: csak elérhető tételek; admin: mind (későbbi „kivonás” funkcióhoz is kell)
        if not is_app_admin(self.request.user):
            queryset = queryset.filter(is_available=True)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        return queryset


class WeeklyMenuItemCreateAPIView(generics.CreateAPIView):
    """
  POST /api/weekly-menu-items/create/

  Adatbázis: új WeeklyMenuItem sor INSERT.
  Példa JSON:
    { "name": "Gombakrémleves", "category": "soup", "is_available": true }

  category értékek: "soup" | "main" | "dessert"
  """

    queryset = WeeklyMenuItem.objects.all()
    serializer_class = WeeklyMenuItemSerializer
    permission_classes = [IsAppAdmin]


def weekly_menu_item_in_use(item):
    """
    Ellenőrzi, hogy a katalógus-tétel szerepel-e valamelyik WeeklyMenu-ban (FK).

    Ha igen → DELETE tiltott (a menü / rendelés lánc érintett lenne).
    """
    return (
        WeeklyMenu.objects.filter(soup=item).exists()
        or WeeklyMenu.objects.filter(main_course=item).exists()
        or WeeklyMenu.objects.filter(dessert=item).exists()
    )


class WeeklyMenuItemDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
  GET    /api/weekly-menu-items/<id>/  → egy tétel olvasása (SELECT)
  PATCH  /api/weekly-menu-items/<id>/  → átnevezés / javítás (UPDATE)
  DELETE /api/weekly-menu-items/<id>/  → törlés (DELETE), csak ha nincs hivatkozás

  Tipikus PATCH (elgépelés javítása):
    { "name": "Gulyásleves" }

  DELETE: ha bármelyik WeeklyMenu soup/main_course/dessert mezője erre mutat → 400.
  """

    queryset = WeeklyMenuItem.objects.all()
    serializer_class = WeeklyMenuItemSerializer
    permission_classes = [IsAppAdmin]

    def destroy(self, request, *args, **kwargs):
        item = self.get_object()
        if weekly_menu_item_in_use(item):
            return Response(
                {"detail": "A tétel heti menükben szerepel, nem törölhető."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Nincs hivatkozás → fizikai DELETE a WeeklyMenuItem táblából
        return super().destroy(request, *args, **kwargs)
