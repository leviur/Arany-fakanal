from rest_framework import serializers
from .models import MenuItem, WeeklyMenu


class MenuItemSerializer(serializers.ModelSerializer):
    category = serializers.StringRelatedField()

    class Meta:
        model = MenuItem
        fields = [
            'id',
            'name',
            'description',
            'price',
            'category',
            'is_available'
        ]

class SimpleMenuItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = MenuItem
        fields = [
            'id',
            'name',
            'description',
            'price'
        ]

class WeeklyMenuSerializer(serializers.ModelSerializer):

    soup = SimpleMenuItemSerializer()
    main_course = SimpleMenuItemSerializer()
    dessert = SimpleMenuItemSerializer()

    class Meta:
        model = WeeklyMenu
        fields = [
            'id',
            'day',
            'menu_type',
            'price',
            'soup',
            'main_course',
            'dessert',
            'is_available'
        ]