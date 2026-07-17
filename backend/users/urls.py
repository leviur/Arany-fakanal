"""
Auth URL-ek — a config/urls.py-ból így érhetők el: /api/auth/...

Példák:
  POST /api/auth/login/
  POST /api/auth/logout/
  POST /api/auth/register/
  GET   /api/auth/me/
  PATCH /api/auth/me/  — név, telefon, cím (bejelentkezés kötelező)
"""

from django.urls import path

from .views import LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("me/", MeView.as_view(), name="auth-me"), # A core/api.js itt a me/-t hívja.
]
