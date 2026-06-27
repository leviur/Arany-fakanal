from django.urls import path
from .views import (
    ContactMessageListAPIView,
    ContactMessageCreateAPIView
)

urlpatterns = [
    path('', ContactMessageListAPIView.as_view(), name='contact-list'),
    path('create/', ContactMessageCreateAPIView.as_view(), name='contact-create'),
]
