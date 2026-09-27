from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsAdmin
from .serializers import MyTokenObtainPairSerializer, UserCreateSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    """POST username + password -> access/refresh tokens + user info."""

    serializer_class = MyTokenObtainPairSerializer


class MeView(APIView):
    """GET the currently authenticated user's profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """
    Administrator-only 'Manage Users' module: Create / Read / Update / Delete
    student, adviser, and admin accounts.
    """

    queryset = User.objects.all().order_by("-created_at")
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        return qs
