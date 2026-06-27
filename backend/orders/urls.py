from django.urls import path

from .views import (
    OrderListAPIView,
    OrderCreateAPIView
)

urlpatterns = [
    path('', OrderListAPIView.as_view(), name='order-list'),
    path('create/', OrderCreateAPIView.as_view(), name='order-create')
]
