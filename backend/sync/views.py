from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import get_revision


class RevisionAPIView(APIView):
    """
    GET /api/revision/ → { "revision": 42 }

    Publikus olvasás: a homepage és a foglalás oldal is poll-olja
    (admin bejelentkezés nélkül). Csak egy számot ad vissza, revision-t.
    """

    def get_permissions(self):
        return [AllowAny()]

    def get(self, request):
        return Response({"revision": get_revision()})
