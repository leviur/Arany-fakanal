"""
Heti menü API URL-ek → melyik view (nézet) fut le.

Minden path a menu/views.py egy osztályához kötődik.
A view végzi az adatbázis-műveletet; ez a fájl csak az útvonalakat definiálja.
"""

from django.urls import path

from .views import (
    AllergenListAPIView,
    CategoryCreateAPIView,
    CategoryDetailAPIView,
    CategoryListAPIView,
    MenuItemCreateAPIView,
    MenuItemDetailAPIView,
    MenuItemListAPIView,
    WeeklyMenuCreateAPIView,
    WeeklyMenuDetailAPIView,
    WeeklyMenuItemCreateAPIView,
    WeeklyMenuItemDetailAPIView,
    WeeklyMenuItemListAPIView,
    WeeklyMenuListAPIView,
)

urlpatterns = [
    path("allergens/", AllergenListAPIView.as_view(), name="allergen-list"),
    path("categories/", CategoryListAPIView.as_view(), name="category-list"),
    path("categories/create/", CategoryCreateAPIView.as_view(), name="category-create"),
    path("categories/<int:pk>/", CategoryDetailAPIView.as_view(), name="category-detail"),
    path("menu/", MenuItemListAPIView.as_view(), name="menu-list"),
    path("menu/create/", MenuItemCreateAPIView.as_view(), name="menu-create"),
    path("menu/<int:pk>/", MenuItemDetailAPIView.as_view(), name="menu-detail"),

    # --- Heti menü (WeeklyMenu tábla) ---
    # GET: aktuális hét menüi (?week_start= hétfő dátuma)
    path("weekly-menu/", WeeklyMenuListAPIView.as_view(), name="weekly-menu-list"),

    # POST: új A vagy B menü egy napra (admin)
    path("weekly-menu/create/", WeeklyMenuCreateAPIView.as_view(), name="weekly-menu-create"),
    
    # GET / PATCH / DELETE: egy konkrét menü id alapján (admin)
    path("weekly-menu/<int:pk>/", WeeklyMenuDetailAPIView.as_view(), name="weekly-menu-detail"),

    # --- Katalógus tételek (WeeklyMenuItem tábla) ---
    # GET: legördülő listához (leves / főétel / desszert nevek)
    path("weekly-menu-items/", WeeklyMenuItemListAPIView.as_view(), name="weekly-menu-items"),
    
    # POST: „+ Új tétel” a dashboardon (admin)
    path("weekly-menu-items/create/", WeeklyMenuItemCreateAPIView.as_view(), name="weekly-menu-item-create"),
    
    # GET / PATCH / DELETE: egy katalógus-tétel (átnevezés, törlés ha árva)
    path("weekly-menu-items/<int:pk>/", WeeklyMenuItemDetailAPIView.as_view(), name="weekly-menu-item-detail"),
]
