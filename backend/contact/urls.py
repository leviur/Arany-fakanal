from django.urls import path

from .views import (
    ContactMessageCreateAPIView,
    ContactMessageDetailAPIView,
    ContactMessageListAPIView,
)

urlpatterns = [
    path("", ContactMessageListAPIView.as_view(), name="contact-list"),
    path("create/", ContactMessageCreateAPIView.as_view(), name="contact-create"),
    path("<int:pk>/", ContactMessageDetailAPIView.as_view(), name="contact-detail"),
]
