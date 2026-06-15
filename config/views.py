from django.shortcuts import render
import random

def home(request):
    return render(request, 'html/homepage.html', {
        "name": "Tomi",
        "lista": ["alma","körte","szilva"]
    })

def etlap(request):
    return render(request, 'html/etlap.html')

def asztalfoglalas(request):
    return render(request, 'html/asztalfoglalas.html')
