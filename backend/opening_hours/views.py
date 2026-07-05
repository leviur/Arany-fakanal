from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.permissions import IsAppAdmin

from .serializers import OpeningHoursPayloadSerializer, build_opening_hours_payload
from .services import ensure_default_weekly_hours


class OpeningHoursAPIView(APIView):
    """
    GET  /api/opening-hours/  — nyitvatartás + eseti kivételek (publikus)
    PUT  /api/opening-hours/  — mentés (admin)
    """

    def get_permissions(self):
        if self.request.method == "PUT":
            return [IsAppAdmin()]
        return [AllowAny()]

    def get(self, request):
        ensure_default_weekly_hours()
        return Response(build_opening_hours_payload())

    def put(self, request):
        ensure_default_weekly_hours()
        serializer = OpeningHoursPayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.save()
        return Response(payload)
