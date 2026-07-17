"""
Vendégközpont — Foglalásaim API.

GET    /api/guest-portal/reservations/              — saját foglalások
PATCH  /api/guest-portal/reservations/<id>/         — szerkesztés (csak pending)
POST   /api/guest-portal/reservations/<id>/cancel/  — lemondás (csak pending)
"""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from reservations.models import Reservation

from .pagination import GuestOrderPagination
from .permissions import IsGuestPortalUser
from .reservation_filters import (
    count_reservations_by_scope,
    filter_reservations_by_scope,
)
from .reservation_serializers import (
    GuestReservationSerializer,
    GuestReservationUpdateSerializer,
    reservation_is_cancellable,
    reservation_is_editable_by_guest,
)


def _guest_reservations_queryset(user):
    """Saját user FK vagy ugyanaz az e-mail (vendég űrlapról)."""
    email = (user.email or "").strip()
    filters = Q(user=user)
    if email:
        filters |= Q(guest_email__iexact=email)
    return Reservation.objects.filter(filters)

# Frontend: bookings.js → fetchGuestBookingsPage()
class GuestReservationListAPIView(generics.ListAPIView):
    """
    GET /api/guest-portal/reservations/?scope=active|closed&page=1

    scope=active  — pending + confirmed
    scope=closed  — done + cancelled
    """

    serializer_class = GuestReservationSerializer
    permission_classes = [IsGuestPortalUser]
    pagination_class = GuestOrderPagination

    def get_queryset(self):
        qs = _guest_reservations_queryset(self.request.user)
        scope = self.request.query_params.get("scope", "active")
        qs = filter_reservations_by_scope(qs, scope)

        if scope == "active":
            return qs.order_by("date", "time")
        return qs.order_by("-date", "-time")

    def list(self, request, *args, **kwargs):
        base_qs = _guest_reservations_queryset(request.user)
        active_count, closed_count = count_reservations_by_scope(base_qs)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        response = self.get_paginated_response(serializer.data)
        response.data["active_count"] = active_count
        response.data["closed_count"] = closed_count
        return response

#Frontend: szerkesztő modál
class GuestReservationUpdateAPIView(generics.UpdateAPIView):
    """
    PATCH /api/guest-portal/reservations/<id>/

    Vendég saját foglalásának módosítása — csak pending státusznál.
    (A Rendeléseim PATCH mintájára: szűk mezőlista + szigorú validáció.)
    """

    serializer_class = GuestReservationUpdateSerializer
    permission_classes = [IsGuestPortalUser]
    http_method_names = ["patch"]

    def get_queryset(self):
        return _guest_reservations_queryset(self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if not reservation_is_editable_by_guest(instance):
            return Response(
                {"detail": "Ez a foglalás már nem módosítható."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        reservation = serializer.save()

        # Teljes válasz — a frontend a can_edit / status_label mezőket is használja
        return Response(GuestReservationSerializer(reservation).data)


class GuestReservationCancelAPIView(APIView):
    """Foglalás lemondása — csak pending státusznál."""

    permission_classes = [IsGuestPortalUser]

    def post(self, request, pk):
        reservation = get_object_or_404(
            _guest_reservations_queryset(request.user),
            pk=pk,
        )

        if not reservation_is_cancellable(reservation):
            return Response(
                {"detail": "Ez a foglalás már nem mondható le."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reservation.status = "cancelled"
        reservation.save(update_fields=["status"])

        return Response(GuestReservationSerializer(reservation).data)
