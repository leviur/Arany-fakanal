from django.shortcuts import render

def homepage(request):
    return render(request, "homepage.html")


def asztalfoglalas(request):
    return render(request, "asztalfoglalas.html")

def etlap(request):
    return render(request, "etlap.html")

def dashboard(request):
    return render(request, "dashboard/index.html")