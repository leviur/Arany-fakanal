from .models import UserProfile


def _get_profile_role(user):
    
    """
    UserProfile szerepkör — nem Guest Portal oldal.
    """

    if not user.is_authenticated:
        return None

    profile = UserProfile.objects.filter(user=user).first()
    return profile.role if profile else None


def is_app_admin(user):

    """
    Csak a UserProfile.role === 'admin' felhasználók férhetnek hozzá a dashboardhoz.
    """

    return _get_profile_role(user) == "admin"


def can_access_guest_portal(user):
    """
    Guest Portal (/guest-portal/): bejelentkezett customer vagy admin.    
    """
    return _get_profile_role(user) in ("customer", "admin")
