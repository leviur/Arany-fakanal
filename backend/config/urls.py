from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Session auth végpontok: login, logout, register, me
    path('api/auth/', include('users.urls')),

    path('api/', include('menu.urls')),

    path('api/orders/', include('orders.urls')),

    path('api/reservations/', include('reservations.urls')),

    path('api/contact/', include('contact.urls')),

    path('', views.homepage),

    path('asztalfoglalas/', views.asztalfoglalas),

    path('etlap/', views.etlap),

    path('dashboard/', views.dashboard),
]
