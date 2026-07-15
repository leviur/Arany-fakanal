"""
Vendégközpont API — ki férhet hozzá?

Minden /api/guest-portal/ végpont ezt használja (orders, reservations).
"""

from rest_framework import permissions

from users.permissions import can_access_guest_portal


class IsGuestPortalUser(permissions.BasePermission):
    # Bejelentkezett customer vagy admin — employee / vendég nélkül → 403

    def has_permission(self, request, view):
        return can_access_guest_portal(request.user)
