from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import get_revision


class RevisionAPIView(APIView):
    """
    GET /api/revision/ → { "revision": 42 }

    Csak egy számot ad vissza — a kliens ezt hasonlítja az előző poll eredményéhez.
    Hívó oldalon: live-sync.js → fetchRevision()

    Olvasás: get_revision() (sync/services.py)
  """

    def get_permissions(self):
        return [AllowAny()]

    def get(self, request):
        return Response({"revision": get_revision()})
