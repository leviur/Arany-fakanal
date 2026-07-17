# Rendelés API útvonalak — orders/views.py
# Prefix: /api/orders/  (config/urls.py)

from django.urls import path

from .views import (
    OrderCreateAPIView,
    OrderItemsDeleteAPIView,
    OrderItemsStatusAPIView,
    OrderListAPIView,
    OrderUpdateAPIView,
)

urlpatterns = [
    # GET: dashboard táblázat (orders.js loadOrdersFromApi)
    path("", OrderListAPIView.as_view(), name="order-list"),

    # POST: kosár leadás (cart.js)
    path("create/", OrderCreateAPIView.as_view(), name="order-create"),

    # PATCH: admin szerkesztés — név, cím, egy nap A/B qty
    path("<int:pk>/", OrderUpdateAPIView.as_view(), name="order-update"),

    # PATCH: nap-sor státusz (dashboard státusz badge)
    path("<int:pk>/items/status/", OrderItemsStatusAPIView.as_view(), name="order-items-status"),
    
    # DELETE: nap-sor törlés (dashboard kuka) — üres rendelés → 204
    path("<int:pk>/items/delete/", OrderItemsDeleteAPIView.as_view(), name="order-items-delete"),
]
