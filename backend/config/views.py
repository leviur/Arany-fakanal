from django.shortcuts import redirect, render

from users.permissions import is_app_admin


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