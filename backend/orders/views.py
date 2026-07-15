# Rendelés API végpontok — dashboard (admin) + kosár leadás (bejelentkezett vendég)

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from sync.services import bump_revision  # revision++ (státusz .update() esetén, lásd alább)

from .models import Order, OrderItem
from .permissions import IsAppAdmin
from .serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    OrderUpdateSerializer,
    normalize_item_status,
)


# GET /api/orders/ — dashboard táblázat (orders.js loadOrdersFromApi)
class OrderListAPIView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAppAdmin]

    def get_queryset(self):
        # user + profile + heti menü — egy lekérdezésben
        return (
            Order.objects
            .select_related("user", "user__profile")
            .prefetch_related("items__weekly_menu")
            .order_by("-id")
        )


# POST /api/orders/create/ — kosár leadás (cart.js)
class OrderCreateAPIView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()  # dupla-védelem a serializerben (conflicts.py)

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


# PATCH /api/orders/<id>/ — admin szerkesztés (név, cím, egy nap A/B qty)
class OrderUpdateAPIView(generics.UpdateAPIView):
    serializer_class = OrderUpdateSerializer
    permission_classes = [IsAppAdmin]

    def get_queryset(self):
        return (
            Order.objects
            .select_related("user", "user__profile")
            .prefetch_related("items__weekly_menu")
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data)


def _order_with_relations(pk):
    # friss JSON válaszhoz — items + weekly_menu előtöltve
    return (
        Order.objects
        .select_related("user", "user__profile")
        .prefetch_related("items__weekly_menu")
        .get(pk=pk)
    )


def _recalculate_order_total(order):
    # részleges törlés után — total_price újraszámolás
    order.recalculate_total()


class OrderItemsStatusAPIView(APIView):
    # PATCH /api/orders/<id>/items/status/ — body: item_ids + status (dashboard badge)
    permission_classes = [IsAppAdmin]

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        item_ids = request.data.get("item_ids")
        status_raw = request.data.get("status")

        if not item_ids or not status_raw:
            return Response(
                {"detail": "item_ids és status kötelező."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(item_ids, list):
            return Response(
                {"detail": "item_ids listában várható."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db_status = normalize_item_status(status_raw)
        valid = {choice[0] for choice in OrderItem.STATUS_CHOICES}
        if db_status not in valid:
            return Response(
                {"detail": "Érvénytelen státusz."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # minden id ehhez a rendeléshez tartozzon
        items = order.items.filter(id__in=item_ids)
        if items.count() != len(item_ids):
            return Response(
                {"detail": "Érvénytelen vagy idegen orderItem azonosító."},
                status=status.HTTP_404_NOT_FOUND,
            )

        items.update(status=db_status)
        # QuerySet.update() nem küld post_save signalt → sync/signals.py nem fut
        # → kézzel: bump_revision() → live-sync.js → loadOrdersFromApi()
        bump_revision()
        order = _order_with_relations(pk)
        return Response(OrderSerializer(order).data)


class OrderItemsDeleteAPIView(APIView):
    # DELETE /api/orders/<id>/items/delete/ — body: item_ids (dashboard kuka gomb)
    permission_classes = [IsAppAdmin]

    def delete(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        item_ids = request.data.get("item_ids")

        if not item_ids or not isinstance(item_ids, list):
            return Response(
                {"detail": "item_ids listában kötelező."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = order.items.filter(id__in=item_ids)
        if items.count() != len(item_ids):
            return Response(
                {"detail": "Érvénytelen vagy idegen orderItem azonosító."},
                status=status.HTTP_404_NOT_FOUND,
            )

        items.delete()  # post_delete signal → bump_revision automatikusan

        if not order.items.exists():
            order.delete()  # orders.js: 204 → removeOrder()
            return Response(status=status.HTTP_204_NO_CONTENT)

        _recalculate_order_total(order)  # maradt másik nap
        order = _order_with_relations(pk)
        return Response(OrderSerializer(order).data)
