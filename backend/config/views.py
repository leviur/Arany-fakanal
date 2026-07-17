from django.shortcuts import redirect, render

from users.permissions import is_app_admin, can_access_guest_portal


def homepage(request):
    return render(request, "homepage.html")


def asztalfoglalas(request):
    return render(request, "asztalfoglalas.html")

def etlap(request):
    return render(request, "etlap.html")

def dashboard(request):
    if not is_app_admin(request.user):
        return redirect("/")

    return render(request, "dashboard/index.html")


def guest_portal(request):
    
    """
    Guest Portal HTML oldal (/guest-portal/) — csak bejelentkezett customer / admin.
    """

    if not can_access_guest_portal(request.user):
        return redirect("/")

    return render(request, "guest-portal/index.html")