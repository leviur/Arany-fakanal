"""
Auth API adatformázók (serializers).

A serializer feladata:
- ellenőrizni a bejövő adatokat (validáció)
- User + UserProfile létrehozása regisztrációnál
- egységes JSON válasz összeállítása a frontendnek
"""

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import UserProfile


class LoginSerializer(serializers.Serializer):
    """Bejelentkezéshez elvárt mezők: email + jelszó."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)  # write_only: soha nem megy vissza a válaszban


class RegisterSerializer(serializers.Serializer):
    """
    Regisztrációhoz elvárt mezők.
    A create() metódus hozza létre a Django User-t és a UserProfile-t.
    """

    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    address = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate_email(self, value):
        """Email egyediség ellenőrzése (kis/nagybetű nem számít)."""
        email = value.lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ez az e-mail cím már regisztrálva van.")
        if User.objects.filter(username__iexact=email).exists():
            raise serializers.ValidationError("Ez az e-mail cím már regisztrálva van.")
        return email

    def validate(self, data):
        """A két jelszó mezőnek egyeznie kell."""
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "A két jelszó nem egyezik."}
            )
        return data

    def create(self, validated_data):
        """
        Új felhasználó létrehozása.
        A username = email, így bejelentkezéskor emaillel tudunk azonosítani.
        """
        email = validated_data["email"]
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
            first_name=validated_data["name"],
        )
        UserProfile.objects.create(
            user=user,
            phone_number=validated_data["phone"],
            address=validated_data["address"],
        )
        return user


def user_to_dict(user):
    """
    Django User → JSON dict.
    Ezt küldjük vissza a login/register/me végpontokon.
    """
    profile = UserProfile.objects.filter(user=user).first()
    role = profile.role if profile else "customer"

    return {
        "id": user.id,
        "email": user.email,
        "name": user.first_name or user.username,
        "phone_number": profile.phone_number if profile else "",
        "address": profile.address if profile else "",
        "role": role,           # customer / employee / admin
        "is_staff": user.is_staff,  # Django admin jogosultság
    }
