from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Böngésző alapértelmezetten /favicon.ico-t kér — átirányítás a statikus fájlra
    path(
        "favicon.ico",
        RedirectView.as_view(url="/static/images/favicon.ico", permanent=True),
    ),

    # Session auth végpontok: login, logout, register, me
    path('api/auth/', include('users.urls')),

    path('api/', include('menu.urls')),

    path('api/', include('opening_hours.urls')),

    path('api/orders/', include('orders.urls')),

    path('api/reservations/', include('reservations.urls')),

    path('api/contact/', include('contact.urls')),

    path('', views.homepage),

    path('asztalfoglalas/', views.asztalfoglalas),

    path('etlap/', views.etlap),

    path('dashboard/', views.dashboard),
]
