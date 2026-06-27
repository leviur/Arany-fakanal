from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile

class RegisterSerializer(serializers.ModelSerializer):

    phone_number = serializers.CharField(max_length=20)
    address = serializers.CharField()
    full_name = serializers.CharField(max_length=100)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'full_name',
            'email',
            'phone_number',
            'address',
            'password',
            'password_confirm',
        ]

        extra_kwargs = {
            "password": {"write_only":True}
        }

    def create(self, validated_data):

        full_name = validated_data.pop("full_name")
        validated_data.pop("password_confirm")
        parts = full_name.strip().split(maxsplit=1)
        
        if len(parts) >1:
            last_name = parts[0]
            first_name = parts[1]
        else:
            last_name = ""
            first_name = parts[0]

        username = validated_data["email"]

        phone_number = validated_data.pop("phone_number")
        address = validated_data.pop("address")

        user = User.objects.create_user(
            username=username,
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name,)

        UserProfile.objects.create(
            user=user,
            phone_number=phone_number,
            address=address,
            role="customer"
        )

        return user
    
    def validate(self, attrs):
        if User.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError(
                {"email": "Ezzel az email címmel már létezik felhasználó."}
            )
        
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password": "A két jelszó nem egyezik."}
            )
        
        return attrs
    
class LoginSerializer(serializers.Serializer):
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
