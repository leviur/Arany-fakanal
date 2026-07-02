from .models import UserProfile


def is_app_admin(user):
    """Csak a UserProfile.role === 'admin' felhasználók férhetnek hozzá a dashboardhoz."""
    if not user.is_authenticated:
        return False

    profile = UserProfile.objects.filter(user=user).first()
    return profile is not None and profile.role == "admin"
