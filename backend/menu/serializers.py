from rest_framework import serializers
from .models import MenuItem, WeeklyMenu, WeeklyMenuItem


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

class WeeklyMenuItemSerializer(serializers.ModelSerializer):

    class Meta:
        models = WeeklyMenuItem
        fields = '__all__'

class WeeklyMenuSerializer(serializers.ModelSerializer):

    soup = WeeklyMenuItemSerializer()
    main_course = WeeklyMenuItemSerializer()
    dessert = WeeklyMenuItemSerializer()

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