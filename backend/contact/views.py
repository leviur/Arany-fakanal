from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from orders.permissions import IsAppAdmin

from .models import ContactMessage
from .serializers import (
    ContactMessageCreateSerializer,
    ContactMessageSerializer,
    ContactMessageUpdateSerializer,
)


class ContactMessageListAPIView(generics.ListAPIView):
    """GET /api/contact/ — összes üzenet (admin)."""

    serializer_class = ContactMessageSerializer
    permission_classes = [IsAppAdmin]

    def get_queryset(self):
        return ContactMessage.objects.all().order_by("-created_at")


class ContactMessageCreateAPIView(generics.CreateAPIView):
    """POST /api/contact/create/ — publikus kapcsolatfelvétel."""

    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageCreateSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return Response(
            ContactMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


class ContactMessageDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/contact/<id>/  — egy üzenet (admin)
    PATCH  /api/contact/<id>/  — olvasott, archivált, típus, státusz
    DELETE /api/contact/<id>/  — végleges törlés (admin)
    """

    queryset = ContactMessage.objects.all()
    permission_classes = [IsAppAdmin]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ContactMessageUpdateSerializer
        return ContactMessageSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return Response(ContactMessageSerializer(message).data)
