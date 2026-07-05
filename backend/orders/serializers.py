from rest_framework import serializers

from .models import Order, OrderItem

WEEKDAY_LABELS = [
    "Hétfő",
    "Kedd",
    "Szerda",
    "Csütörtök",
    "Péntek",
    "Szombat",
    "Vasárnap",
]

# DB kulcs (new) ↔ dashboard felirat (Új)
STATUS_API_TO_HU = dict(OrderItem.STATUS_CHOICES)
STATUS_HU_TO_API = {label: key for key, label in OrderItem.STATUS_CHOICES}


def normalize_item_status(value):
    """API kulcs vagy magyar felirat → DB érték (pl. confirmed)."""
    if value in STATUS_API_TO_HU:
        return value
    return STATUS_HU_TO_API.get(value, value)


class OrderItemSerializer(serializers.ModelSerializer):
    menu_type = serializers.CharField(source="weekly_menu.menu_type", read_only=True)
    day = serializers.SerializerMethodField()
    menu = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "weekly_menu",
            "delivery_date",
            "created_at",
            "quantity",
            "unit_price",
            "menu_type",
            "day",
            "menu",
            "status",
        ]
        read_only_fields = ["created_at"]

    def get_day(self, obj):
        return WEEKDAY_LABELS[obj.delivery_date.weekday()]

    def get_menu(self, obj):
        return f"{obj.weekly_menu.menu_type} menü"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Mindig API kulcsot küldünk; a frontend mapeli magyarra
        data["status"] = normalize_item_status(instance.status)
        return data


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "customer_name",
            "customer_phone",
            "delivery_address",
            "total_price",
            "created_at",
            "items",
        ]

    def get_customer_name(self, obj):
        return obj.user.first_name or obj.user.username

    def get_customer_phone(self, obj):
        profile = getattr(obj.user, "profile", None)
        return profile.phone_number if profile else ""

    def get_created_at(self, obj):
        created_times = [item.created_at for item in obj.items.all() if item.created_at]
        if not created_times:
            return None
        return min(created_times)


class OrderItemCreateSerializer(serializers.Serializer):

    weekly_menu = serializers.IntegerField()

    quantity = serializers.IntegerField(min_value=1)

    delivery_date = serializers.DateField()


class OrderCreateSerializer(serializers.Serializer):

    delivery_address = serializers.CharField()

    items = OrderItemCreateSerializer(many=True)

    def create(self, validated_data):
        from menu.models import WeeklyMenu

        items_data = validated_data.pop("items")
        user = self.context["request"].user

        order = Order.objects.create(
            user=user,
            delivery_address=validated_data["delivery_address"],
        )

        total_price = 0

        for item_data in items_data:
            weekly_menu = WeeklyMenu.objects.get(id=item_data["weekly_menu"])

            quantity = item_data["quantity"]
            unit_price = weekly_menu.price

            OrderItem.objects.create(
                order=order,
                weekly_menu=weekly_menu,
                delivery_date=item_data["delivery_date"],
                quantity=quantity,
                unit_price=unit_price,
            )

            total_price += unit_price * quantity

        order.total_price = total_price
        order.save()

        return order
    
class OrderItemLineUpdateSerializer(serializers.Serializer):
    """Egy nap A vagy B menüjének darabszáma (delivery_date nem változik)."""

    menu_type = serializers.ChoiceField(choices=["A", "B"])
    quantity = serializers.IntegerField(min_value=0, max_value=20)


class OrderUpdateSerializer(serializers.Serializer):
    """
    Dashboard szerkesztő: vevő adatai + opcionálisan egy nap menü-tételei.
    item_lines: ugyanarra a delivery_date-re A/B menü és darabszám (nap nem változik).
    """

    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    delivery_address = serializers.CharField(required=False, allow_blank=True)
    delivery_date = serializers.DateField(required=False)
    item_lines = OrderItemLineUpdateSerializer(many=True, required=False)

    def validate(self, attrs):
        delivery_date = attrs.get("delivery_date")
        item_lines = attrs.get("item_lines")

        if (delivery_date is None) ^ (item_lines is None):
            raise serializers.ValidationError(
                "A tételek módosításához delivery_date és item_lines együtt szükséges."
            )

        if item_lines is not None:
            quantities = {line["menu_type"]: line["quantity"] for line in item_lines}
            total_qty = quantities.get("A", 0) + quantities.get("B", 0)
            if total_qty < 1:
                raise serializers.ValidationError(
                    "Legalább egy menü darabszáma legyen legalább 1."
                )

        return attrs

    def _update_delivery_day_items(self, order, delivery_date, item_lines):
        from menu.models import WeeklyMenu

        quantities = {line["menu_type"]: line["quantity"] for line in item_lines}
        existing_items = list(
            order.items.filter(delivery_date=delivery_date).select_related("weekly_menu")
        )
        if not existing_items:
            raise serializers.ValidationError("Ehhez a kiszállítási naphoz nem tartozik tétel.")

        row_status = existing_items[0].status
        # A heti menü sablon napja (WeeklyMenu.day) ≠ kiszállítási dátum (delivery_date).
        menu_slot_day = existing_items[0].weekly_menu.day

        for menu_type in ("A", "B"):
            qty = quantities.get(menu_type, 0)
            existing = next(
                (item for item in existing_items if item.weekly_menu.menu_type == menu_type),
                None,
            )

            if qty <= 0:
                if existing:
                    existing.delete()
                continue

            weekly_menu = WeeklyMenu.objects.filter(
                day=menu_slot_day,
                menu_type=menu_type,
            ).first()
            if not weekly_menu:
                raise serializers.ValidationError(
                    f"Nincs {menu_type} menü a rendeléshez tartozó heti menü napon."
                )

            if existing:
                existing.weekly_menu = weekly_menu
                existing.quantity = qty
                existing.unit_price = weekly_menu.price
                existing.save()
            else:
                OrderItem.objects.create(
                    order=order,
                    weekly_menu=weekly_menu,
                    delivery_date=delivery_date,
                    quantity=qty,
                    unit_price=weekly_menu.price,
                    status=row_status,
                )

        order.recalculate_total()

    def update(self, instance, validated_data):
        delivery_date = validated_data.pop("delivery_date", None)
        item_lines = validated_data.pop("item_lines", None)
        user = instance.user

        if "customer_name" in validated_data:
            user.first_name = validated_data["customer_name"]

        if "customer_phone" in validated_data:
            profile = getattr(user, "profile", None)
            if profile is not None:
                profile.phone_number = validated_data["customer_phone"]
                profile.save()

        if "delivery_address" in validated_data:
            instance.delivery_address = validated_data["delivery_address"]

        user.save()
        instance.save()

        if delivery_date is not None and item_lines is not None:
            self._update_delivery_day_items(instance, delivery_date, item_lines)

        return instance