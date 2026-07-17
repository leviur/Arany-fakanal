"""
Átalakítja a DB adatot JSON-né, amit a frontend kap — és validálja, amit a vendég visszaküld PATCH-nél.

Vendégközpont rendelés API — a dashboardhoz képest szűkebb jogosultságokkal.

A vendég csak a saját rendeléseit látja, és csak „Új” státuszú tételeket módosíthat.
"""

from rest_framework import serializers

from orders.models import Order, OrderItem
from orders.serializers import (
    OrderItemLineUpdateSerializer,
    OrderItemSerializer,
    OrderSerializer,
    OrderUpdateSerializer,
)


def item_is_editable_by_guest(item):
    """Még nem vette kézbe az admin — ilyenkor engedjük a módosítást."""
    return item.status == "new"

#  egy tétel a listában
class GuestOrderItemSerializer(OrderItemSerializer):
    can_edit = serializers.SerializerMethodField()

    class Meta(OrderItemSerializer.Meta):
        fields = OrderItemSerializer.Meta.fields + ["can_edit"]

    def get_can_edit(self, obj):
        return item_is_editable_by_guest(obj)

# egy rendelés a listában
class GuestOrderSerializer(OrderSerializer):
    """Ugyanaz mint az admin listában, de user id nélkül + can_edit jelzés a tételeken."""

    items = GuestOrderItemSerializer(many=True, read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = [
            "id",
            "customer_name",
            "customer_phone",
            "delivery_address",
            "total_price",
            "created_at",
            "items",
        ]


class GuestOrderUpdateSerializer(serializers.Serializer):
    """
    Vendég PATCH — cím, illetve egy nap A/B mennyiségei.
    A nap csak akkor szerkeszthető, ha minden tétel státusza „new”.
    """

    delivery_address = serializers.CharField(required=False, allow_blank=False)
    delivery_date = serializers.DateField(required=False)
    item_lines = OrderItemLineUpdateSerializer(many=True, required=False)

    def validate(self, attrs):
        delivery_date = attrs.get("delivery_date")
        item_lines = attrs.get("item_lines")

        if (delivery_date is None) ^ (item_lines is None):
            raise serializers.ValidationError(
                "A mennyiség módosításához delivery_date és item_lines együtt kell."
            )

        if item_lines is not None:
            quantities = {line["menu_type"]: line["quantity"] for line in item_lines}
            total_qty = quantities.get("A", 0) + quantities.get("B", 0)
            if total_qty < 1:
                raise serializers.ValidationError(
                    "Legalább egy menü darabszáma legyen legalább 1."
                )

        return attrs

    def _ensure_day_editable(self, order, delivery_date):
        day_items = list(order.items.filter(delivery_date=delivery_date))
        if not day_items:
            raise serializers.ValidationError("Ehhez a naphoz nem tartozik tétel.")

        locked = [item for item in day_items if not item_is_editable_by_guest(item)]
        if locked:
            raise serializers.ValidationError(
                "Ez a nap már feldolgozás alatt van, nem módosítható."
            )

    def update(self, instance, validated_data):
        delivery_date = validated_data.pop("delivery_date", None)
        item_lines = validated_data.pop("item_lines", None)

        if "delivery_address" in validated_data:
            instance.delivery_address = validated_data["delivery_address"].strip()
            instance.save(update_fields=["delivery_address"])

        if delivery_date is not None and item_lines is not None:
            self._ensure_day_editable(instance, delivery_date)
            # A meglévő admin logikát használjuk a tényleges mentéshez
            admin_serializer = OrderUpdateSerializer()
            admin_serializer._update_delivery_day_items(
                instance, delivery_date, item_lines
            )

        return instance
