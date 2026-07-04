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
    
class OrderUpdateSerializer(serializers.Serializer):
    """
    Dashboard szerkesztő: vevő neve, telefonja, szállítási cím.
    Nem Order mezők közvetlenül — user / profile / delivery_address frissül.
    """

    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    delivery_address = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
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
        return instance