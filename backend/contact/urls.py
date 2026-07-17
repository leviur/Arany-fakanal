# Kapcsolat / üzenet API — contact/views.py
# Prefix: /api/contact/

from django.urls import path

from .views import (
    ContactMessageCreateAPIView,
    ContactMessageDetailAPIView,
    ContactMessageListAPIView,
)

urlpatterns = [
    # GET: dashboard inbox (messages.js)
    path("", ContactMessageListAPIView.as_view(), name="contact-list"),

    # POST: főoldal kapcsolat űrlap (contact-form.js)
    path("create/", ContactMessageCreateAPIView.as_view(), name="contact-create"),
    
    # GET / PATCH / DELETE: olvasott, archivált, típus, törlés
    path("<int:pk>/", ContactMessageDetailAPIView.as_view(), name="contact-detail"),
]
