"""
Session authentication API végpontok.

Működés:
- login()  → Django session cookie létrejön a böngészőben
- logout() → session törlődik
- A következő kéréseknél a böngésző automatikusan küldi a session cookie-t
"""

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import models
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, RegisterSerializer, user_to_dict


class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: { "email": "...", "password": "..." }

    Sikeres válasz: felhasználó adatai + session cookie beállítva.
    """

    permission_classes = [AllowAny]  # bejelentkezés előtt bárki hívhatja

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        password = serializer.validated_data["password"]

        # Keresés email VAGY username alapján (régi userek username-je lehet "admin", nem email)
        user_obj = User.objects.filter(
            models.Q(username__iexact=email) | models.Q(email__iexact=email)
        ).first()
        if user_obj is None:
            return Response(
                {"detail": "Hibás e-mail cím vagy jelszó."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Jelszó ellenőrzése (hash-elt jelszóval hasonlít össze)
        user = authenticate(request, username=user_obj.username, password=password)
        if user is None:
            return Response(
                {"detail": "Hibás e-mail cím vagy jelszó."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Session létrehozása — innentől request.user azonosítja a felhasználót
        login(request, user)
        return Response(user_to_dict(user))


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Csak bejelentkezett felhasználó hívhatja (IsAuthenticated).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)  # session törlése
        return Response({"detail": "Sikeres kijelentkezés."})


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Body: { name, email, phone, address, password, password_confirm }

    Sikeres regisztráció után automatikusan be is jelentkeztetjük a usert.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)  # regisztráció után azonnali bejelentkezés
        return Response(user_to_dict(user), status=status.HTTP_201_CREATED)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """
    GET /api/auth/me/
    Visszaadja az aktuális bejelentkezett felhasználót.

    Ha nincs session: { "authenticated": false }
    Ha van session:   { id, email, name, role, ... }

    Az ensure_csrf_cookie biztosítja, hogy a GET kérés beállítsa
    a csrftoken cookie-t a későbbi POST kérésekhez.
    """

    permission_classes = [AllowAny]  # nem bejelentkezett user is hívhatja (false-t kap)

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False})

        return Response(user_to_dict(request.user))
