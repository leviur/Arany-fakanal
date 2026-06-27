from rest_framework import serializers
from .models import ContactMessage

class ContactMessageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContactMessage
        fields = '__all__'

class ContactMessageCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContactMessage
        fields= [
            'name',
            'email',
            'subject',
            'message'
        ]
    
    def create(self, validated_data):
        validated_data["status"] = "new"
        return ContactMessage.objects.create(**validated_data)
