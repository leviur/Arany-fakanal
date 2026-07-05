from django.urls import path

from .views import RevisionAPIView

urlpatterns = [
    path("revision/", RevisionAPIView.as_view(), name="revision"),
]
