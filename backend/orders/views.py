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


class OrderListAPIView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAppAdmin]

    def get_queryset(self):
        return (
            Order.objects
            .select_related("user", "user__profile")
            .prefetch_related("items__weekly_menu")
            .order_by("-id")
        )


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
        order = serializer.save()

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class OrderUpdateAPIView(generics.UpdateAPIView):
    """
    PATCH /api/orders/<id>/
    Admin: vevő adatai; opcionálisan egy nap A/B menü és darabszám (delivery_date fix).
    """
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
    return (
        Order.objects
        .select_related("user", "user__profile")
        .prefetch_related("items__weekly_menu")
        .get(pk=pk)
    )


def _recalculate_order_total(order):
    order.recalculate_total()


class OrderItemsStatusAPIView(APIView):
    """
    PATCH /api/orders/<order_id>/items/status/
    Body: { "item_ids": [2, 3], "status": "confirmed" }  (vagy magyar: "Elfogadva")
    A megadott OrderItem rekordok státusza frissül.
    """

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

        items = order.items.filter(id__in=item_ids)
        if items.count() != len(item_ids):
            return Response(
                {"detail": "Érvénytelen vagy idegen orderItem azonosító."},
                status=status.HTTP_404_NOT_FOUND,
            )

        items.update(status=db_status)
        # QuerySet.update() nem küld post_save signalt → revision kézzel
        bump_revision()
        order = _order_with_relations(pk)
        return Response(OrderSerializer(order).data)


class OrderItemsDeleteAPIView(APIView):
    """
    DELETE /api/orders/<order_id>/items/delete/
    Body: { "item_ids": [2, 3] }
    Csak a megadott tételek törlődnek; üres rendelés esetén az Order is törlődik.
    """

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

        items.delete()

        if not order.items.exists():
            order.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        _recalculate_order_total(order)
        order = _order_with_relations(pk)
        return Response(OrderSerializer(order).data)
