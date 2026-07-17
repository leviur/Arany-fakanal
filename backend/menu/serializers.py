"""
Szekrializálók: Django modell ↔ JSON váltás.

Olvasás (GET):  modellmezők → JSON (a frontend ezt kapja)
Írás (POST/PATCH): JSON → modellmezők → adatbázis mentés

Fontos: ForeignKey mezőknél (soup, main_course, dessert) íráskor elég
a kapcsolt WeeklyMenuItem *azonosítója* (szám). A DRF ebből megkeresi a sort.
"""

from rest_framework import serializers

from .models import Allergen, Category, MenuItem, WeeklyMenu, WeeklyMenuItem


class CategorySerializer(serializers.ModelSerializer):
    """Kategória → JSON (étlap navigáció, étel csoportosítás)."""

    class Meta:
        model = Category
        fields = ["id", "name"]


class AllergenSerializer(serializers.ModelSerializer):
    """Allergén → JSON (ikon + felirat az étlapon)."""

    class Meta:
        model = Allergen
        fields = ["id", "key", "name", "icon", "label"]


class MenuItemSerializer(serializers.ModelSerializer):
    """
    Állandó étlap tétel → JSON.
    category és allergens beágyazva (mint a régi foods_with_category_and_allergens.json).
    """

    category = CategorySerializer(read_only=True)
    allergens = AllergenSerializer(many=True, read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id",
            "name",
            "description",
            "price",
            "category",
            "allergens",
            "is_available",
        ]


class MenuItemWriteSerializer(serializers.ModelSerializer):
    """Dashboard mentés: category id + allergén kulcsok listája."""

    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    allergen_keys = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        default=list,
    )

    class Meta:
        model = MenuItem
        fields = [
            "id",
            "name",
            "description",
            "price",
            "category",
            "is_available",
            "allergen_keys",
        ]

    def _set_allergens(self, item, keys):
        item.allergens.set(Allergen.objects.filter(key__in=keys))

    def create(self, validated_data):
        keys = validated_data.pop("allergen_keys", [])
        item = MenuItem.objects.create(**validated_data)
        self._set_allergens(item, keys)
        return item

    def update(self, instance, validated_data):
        keys = validated_data.pop("allergen_keys", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if keys is not None:
            self._set_allergens(instance, keys)
        return instance


class SimpleMenuItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = MenuItem
        fields = [
            "id",
            "name",
            "description",
            "price",
        ]


class WeeklyMenuItemSerializer(serializers.ModelSerializer):
    """
    WeeklyMenuItem → JSON (katalógus-tétel).
    Mezők: id, name, category (soup/main/dessert), is_available
    """

    class Meta:
        model = WeeklyMenuItem
        fields = [
            "id",
            "name",
            "category",
            "is_available",
        ]


class WeeklyMenuSerializer(serializers.ModelSerializer):
    """
    Olvasáshoz (GET): a WeeklyMenu mellett a 3 kapcsolt tétel *teljes* adata is kell
    (név megjelenítéshez a dashboardon). Ezért beágyazott WeeklyMenuItemSerializer.
    """

    soup = WeeklyMenuItemSerializer()
    main_course = WeeklyMenuItemSerializer()
    dessert = WeeklyMenuItemSerializer()

    class Meta:
        model = WeeklyMenu
        fields = [
            "id",
            "day",
            "menu_type",
            "price",
            "soup",
            "main_course",
            "dessert",
            "is_available",
        ]


class WeeklyMenuWriteSerializer(serializers.ModelSerializer):
    """
    Íráshoz (POST / PATCH): a frontend csak az id-kat küldi a tételekhez.
    Példa: "soup": 7  →  Django a 7-es WeeklyMenuItem sorra mutató FK-t menti.

    A validate() ellenőrzi, hogy leves mezőbe ne kerüljön desszert stb.
    """

    class Meta:
        model = WeeklyMenu
        fields = [
            "id",
            "day",
            "menu_type",
            "price",
            "soup",
            "main_course",
            "dessert",
            "is_available",
        ]

    def validate(self, attrs):
        # Üzleti szabály: minden slotba a megfelelő kategóriájú tétel kerülhet
        slot_map = {
            "soup": attrs.get("soup"),
            "main": attrs.get("main_course"),
            "dessert": attrs.get("dessert"),
        }
        errors = {}
        for expected_category, item in slot_map.items():
            if item and item.category != expected_category:
                errors[expected_category] = (
                    f"A kiválasztott tétel nem {expected_category} kategóriájú."
                )
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
