from django.urls import path

from .views import (
    OrderCreateAPIView,
    OrderItemsDeleteAPIView,
    OrderItemsStatusAPIView,
    OrderListAPIView,
    OrderUpdateAPIView,
)

urlpatterns = [
    path("", OrderListAPIView.as_view(), name="order-list"),
    path("create/", OrderCreateAPIView.as_view(), name="order-create"),
    path("<int:pk>/", OrderUpdateAPIView.as_view(), name="order-update"),
    path("<int:pk>/items/status/", OrderItemsStatusAPIView.as_view(), name="order-items-status"),
    path("<int:pk>/items/delete/", OrderItemsDeleteAPIView.as_view(), name="order-items-delete"),
]
