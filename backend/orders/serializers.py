from rest_framework import serializers
from .models import Order, OrderItem
from menu.models import WeeklyMenu

class OrderItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'weekly_menu',
            'quantity',
            'unit_price'
        ]

class OrderSerializer(serializers.ModelSerializer):

    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Order

        fields = [
            'id',
            'user',
            'delivery_date',
            'delivery_address',
            'status',
            'total_price',
            'created_at',
            'items'
        ]

class OrderItemCreateSerializer(serializers.Serializer):

    weekly_menu = serializers.PrimaryKeyRelatedField(
        queryset=WeeklyMenu.objects.all()
    )

    quantity = serializers.IntegerField(
        min_value=1
    )

class OrderCreateSerializer(serializers.Serializer):

    delivery_date = serializers.DateField()

    delivery_address = serializers.CharField()

    items = OrderItemCreateSerializer(
        many=True
    )

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        order = Order.objects.create(
            user=user,
            delivery_date=validated_data['delivery_date'],
            delivery_address=validated_data['delivery_address']
        )

        total_price = 0

        for item_data in items_data:
            weekly_menu = item_data['weekly_menu']
         
            quantity = item_data['quantity']

            unit_price = weekly_menu.price

            OrderItem.objects.create(
                order=order,
                weekly_menu=weekly_menu,
                quantity=quantity,
                unit_price=unit_price
            )

            total_price += unit_price*quantity
        
        order.total_price = total_price
        order.save()

        return order