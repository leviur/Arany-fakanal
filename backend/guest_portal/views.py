"""
Vendégközpont — Rendeléseim API.

GET    /api/guest-portal/orders/              — saját rendelések
PATCH  /api/guest-portal/orders/<id>/         — cím vagy nap mennyiségei
DELETE /api/guest-portal/orders/<id>/items/   — tételek lemondása (body: item_ids)
"""

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order

from .order_filters import count_orders_by_scope, filter_orders_by_scope
from .pagination import GuestOrderPagination
from .permissions import IsGuestPortalUser
from .serializers import (
    GuestOrderSerializer,
    GuestOrderUpdateSerializer,
    item_is_editable_by_guest,
)


def _guest_orders_queryset(user):
    return (
        Order.objects.filter(user=user) # Csak a saját rendelései 
        .prefetch_related(
            "items__weekly_menu__soup",
            "items__weekly_menu__main_course",
            "items__weekly_menu__dessert",
        )
        .order_by("-id")
    )


def _reload_guest_order(user, order_id):
    """
    Friss rendelés DB-ből — PATCH után kell, mert a prefetch cache
    nem frissül magától, ha a tételek közben megváltoztak.
    """
    return _guest_orders_queryset(user).get(pk=order_id)


class GuestOrderListAPIView(generics.ListAPIView):
    """
    Lekéri a user rendeléseit
    GET /api/guest-portal/orders/?scope=active|closed&page=1

    scope=active  — folyamatban (alapértelmezett)
    scope=closed  — minden tétel lezárva
    """
    serializer_class = GuestOrderSerializer
    permission_classes = [IsGuestPortalUser]
    pagination_class = GuestOrderPagination

    def get_queryset(self):
        qs = _guest_orders_queryset(self.request.user)
        scope = self.request.query_params.get("scope", "active")
        if scope in ("active", "closed"):
            qs = filter_orders_by_scope(qs, scope)
        return qs

    def list(self, request, *args, **kwargs):
        base_qs = _guest_orders_queryset(request.user)
        active_count, closed_count = count_orders_by_scope(base_qs)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        response = self.get_paginated_response(serializer.data)
        response.data["active_count"] = active_count
        response.data["closed_count"] = closed_count
        return response

#Frontend: lemondás modál
class GuestOrderUpdateAPIView(generics.UpdateAPIView):
    serializer_class = GuestOrderUpdateSerializer
    permission_classes = [IsGuestPortalUser]
    http_method_names = ["patch"]

    def get_queryset(self):
        return _guest_orders_queryset(self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        # Prefetch cache ürítése — különben a régi mennyiségek jönnek vissza első mentésre
        order = _reload_guest_order(self.request.user, order.pk)
        return Response(GuestOrderSerializer(order).data)


class GuestOrderItemDeleteAPIView(APIView):
    """
    Tételek törlése — csak „Új” státuszúak.
    Ha minden tétel megy, a rendelés is törlődik.
    """

    permission_classes = [IsGuestPortalUser]

    def delete(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        item_ids = request.data.get("item_ids")

        if not item_ids or not isinstance(item_ids, list):
            return Response(
                {"detail": "item_ids listában kötelező."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = list(order.items.filter(id__in=item_ids))
        if len(items) != len(item_ids):
            return Response(
                {"detail": "Érvénytelen tétel azonosító."},
                status=status.HTTP_404_NOT_FOUND,
            )

        not_editable = [item for item in items if not item_is_editable_by_guest(item)]
        if not_editable:
            return Response(
                {"detail": "A kiválasztott tételek közül legalább egy már nem mondható le."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for item in items:
            item.delete()

        if not order.items.exists():
            order.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        order.recalculate_total()
        order = _reload_guest_order(request.user, pk)
        return Response(GuestOrderSerializer(order).data)
