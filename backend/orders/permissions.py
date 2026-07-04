from rest_framework import permissions

from users.permissions import is_app_admin


class IsAppAdmin(permissions.BasePermission):
    """Csak UserProfile.role === 'admin' felhasználó (dashboard)."""

    def has_permission(self, request, view):
        return is_app_admin(request.user)
