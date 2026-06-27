from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/', include('menu.urls')),

    path('api/orders/', include('orders.urls')),

    path('api/reservations/', include('reservations.urls')),

    path('api/contact/', include('contact.urls'))
]
