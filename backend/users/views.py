from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
)

from django.contrib.auth import authenticate
from django.contrib.auth.models import User

# Create your views here.

class RegisterAPIView(APIView):

    def post(self, request):

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            return Response(
                {"message": "Sikeres regisztráció."},
                status= status.HTTP_201_CREATED
            )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class LoginAPIView(APIView):

    def post(self, request):
        
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Hibás email cím vagy jelszó."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = authenticate(
            username=user.username,
            password=password
        )

        if user is None:
            return Response(
                {"error": "Hibás email cím vagy jelszó."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)

        return Response({
            "refresh":str(refresh),
            "access":str(refresh.access_token),
        })
