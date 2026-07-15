from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Böngésző alapértelmezetten /favicon.ico-t kér (A lap címe mellett kis ikon) — átirányítás a statikus fájlra
    path("favicon.ico", RedirectView.as_view(url="/static/images/favicon.ico", permanent=True)),

    # Session auth végpontok: login, logout, register, me
    path('api/auth/', include('users.urls')),

    path('api/', include('menu.urls')),

    path('api/', include('opening_hours.urls')),

    path('api/', include('sync.urls')),  # GET /api/revision/ verziolekereshez(frissiteshez kell), ezt hívja a live-sync.js.

    path('api/orders/', include('orders.urls')),

    # Vendégközpont — saját rendelések, foglalások stb.
    path('api/guest-portal/', include('guest_portal.urls')),

    path('api/reservations/', include('reservations.urls')),

    path('api/contact/', include('contact.urls')),

    path('', views.homepage),

    path('asztalfoglalas/', views.asztalfoglalas),

    path('etlap/', views.etlap),

    path('dashboard/', views.dashboard),

    # Guest Portal — vendég saját felülete (rendelések, foglalások stb.)
    path('guest-portal/', views.guest_portal),
]
