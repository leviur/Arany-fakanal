from rest_framework import serializers
from .models import Reservation

class ReservationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Reservation
        fields = '__all__'

class ReservationCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Reservation
        fields = [
            'guest_name',
            'guest_email',
            'guest_phone',
            'date',
            'time',
            'guest_count',
            'notes'
        ]