from rest_framework import serializers
from .models import MenuItem, WeeklyMenu, WeeklyMenuItem
# ,Category, Allergen

# 1. Category serializer - objektumként adja vissza (id + name)
# class CategorySerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Category
#         fields = ['id', 'name']


# 2. Allergen serializer - a frontend name, icon, label mezőket vár
# class AllergenSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Allergen
#         fields = ['name', 'icon', 'label']

# 3. Javított MenuItemSerializer
class MenuItemSerializer(serializers.ModelSerializer):
    category = serializers.StringRelatedField()
    #category = CategorySerializer()        # objektum, nem string

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
        model = WeeklyMenuItem
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