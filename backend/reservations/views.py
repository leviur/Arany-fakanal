from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.permissions import IsAppAdmin
from sync.services import bump_revision

from .models import Reservation
from .serializers import (
    ReservationCreateSerializer,
    ReservationSerializer,
    ReservationUpdateSerializer,
    normalize_reservation_status,
)

class ReservationListAPIView(generics.ListAPIView):
    queryset = Reservation.objects.all().order_by("-date", "-time")
    serializer_class = ReservationSerializer
    permission_classes = [IsAppAdmin]


class ReservationCreateAPIView(generics.CreateAPIView):
    queryset = Reservation.objects.all()
    serializer_class = ReservationCreateSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        return {"request": self.request}

class ReservationStatusAPIView(APIView):
    """
    PATCH /api/reservations/<id>/status/
    Body: { "status": "confirmed" }  (vagy magyar: "Visszaigazolt")
    """

    permission_classes = [IsAppAdmin]

    def patch(self, request, pk):
        reservation = get_object_or_404(Reservation, pk=pk)
        status_raw = request.data.get("status")

        if not status_raw:
            return Response(
                {"detail": "status kötelező."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db_status = normalize_reservation_status(status_raw)
        valid = {choice[0] for choice in Reservation.STATUS_CHOICES}
        if db_status not in valid:
            return Response(
                {"detail": "Érvénytelen státusz."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Reservation.objects.filter(pk=pk).update(status=db_status)
        # QuerySet.update() nem küld signalt → bump_revision() → live-sync.js → Bookings.refresh()
        bump_revision()
        reservation.refresh_from_db()
        return Response(ReservationSerializer(reservation).data)


class ReservationDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/reservations/<id>/  — egy foglalás (admin)
    PATCH  /api/reservations/<id>/  — szerkesztés (státusz nélkül)
    DELETE /api/reservations/<id>/  — törlés az adatbázisból
    """

    queryset = Reservation.objects.all()
    permission_classes = [IsAppAdmin]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ReservationUpdateSerializer
        return ReservationSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()
        return Response(ReservationSerializer(reservation).data)
