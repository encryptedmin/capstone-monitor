import json

from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import LoginSession, SchoolYear, SystemSetting, User
from .permissions import IsAdmin, IsAdminOrAdviser, IsAdminOrPublicReadOnly
from .serializers import (
    MyTokenObtainPairSerializer,
    RegisterSerializer,
    SchoolYearSerializer,
    StrictTokenRefreshSerializer,
    SystemSettingSerializer,
    UserCreateSerializer,
    UserSerializer,
)


class LoginView(TokenObtainPairView):
    """POST email + password -> access/refresh tokens + user info.
    Django's auth backend rejects is_active=False users automatically,
    which covers both "pending approval" and "disabled" accounts."""

    serializer_class = MyTokenObtainPairSerializer


class StrictTokenRefreshView(TokenRefreshView):
    serializer_class = StrictTokenRefreshSerializer


class LogoutView(APIView):
    """End the current JWT session.

    This endpoint intentionally accepts a refresh token without requiring
    request authentication so browser unload/beacon cleanup can invalidate the
    server session even while the page is closing.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = self._get_refresh_token(request)
        if refresh_token:
            self._end_session(refresh_token)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _get_refresh_token(self, request):
        body = request.body.decode("utf-8", errors="ignore").strip()
        if not body:
            return ""
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return ""
        if not isinstance(payload, dict):
            return ""
        refresh_token = payload.get("refresh", "")
        return refresh_token if isinstance(refresh_token, str) else ""

    def _end_session(self, refresh_token):
        try:
            refresh = RefreshToken(refresh_token)
        except TokenError:
            return

        session_id = refresh.get("sid")
        device_id = refresh.get("did")
        if not session_id or not device_id:
            return

        LoginSession.objects.filter(
            id=session_id,
            device_id=device_id,
            ended_at__isnull=True,
        ).update(ended_at=timezone.now(), end_reason=LoginSession.END_LOGOUT)


class RegisterView(generics.CreateAPIView):
    """Public student self-registration. Account is created pending admin
    approval (is_active=False). Adviser accounts are admin-created."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Registration submitted. An administrator must approve your "
                "account before you can log in.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """GET the currently authenticated user's profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """
    Administrator-only 'Manage Users' module: Create / Read / Update / Delete
    user accounts. Create is limited to adviser accounts; students self-register.
    Deleting a user does NOT cascade
    to their capstone group, milestones, submissions, or feedback -- those
    stay in place for records/audit purposes.

    The `set-active` action additionally allows an Adviser to disable (not
    delete) one of their own advisees.
    """

    queryset = User.objects.all().order_by("-created_at")
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == "set_active":
            return [IsAdminOrAdviser()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        acct_status = self.request.query_params.get("status")
        if acct_status == "pending":
            qs = qs.filter(is_active=False, approved_at__isnull=True)
        elif acct_status == "disabled":
            qs = qs.filter(is_active=False, approved_at__isnull=False)
        elif acct_status == "active":
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=True, methods=["post"], url_path="set-adviser-capacity")
    def set_adviser_capacity(self, request, pk=None):
        """Admin override of a single adviser's advisory-group cap. Pass
        {"capacity_override": null} to clear it back to the system default."""
        target = self.get_object()
        if target.role != User.Role.ADVISER or not hasattr(target, "adviser_profile"):
            return Response({"detail": "That user is not an adviser."}, status=status.HTTP_400_BAD_REQUEST)

        raw = request.data.get("capacity_override", None)
        if raw in (None, ""):
            value = None
        else:
            try:
                value = int(raw)
                if value < 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response(
                    {"detail": "capacity_override must be a non-negative integer or null."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        target.adviser_profile.capacity_override = value
        target.adviser_profile.save(update_fields=["capacity_override"])
        return Response(UserSerializer(target).data)

    @action(detail=True, methods=["post"], url_path="set-active")
    def set_active(self, request, pk=None):
        target = self.get_object()
        is_active = request.data.get("is_active")
        if is_active is None:
            return Response({"detail": "is_active is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.is_admin:
            # Advisers may only disable (not enable, not delete) their own
            # advisees -- never other advisers, admins, or unaffiliated students.
            if target.role != User.Role.STUDENT:
                return Response(
                    {"detail": "Advisers can only manage student accounts."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if bool(is_active):
                return Response(
                    {"detail": "Only an administrator can re-enable an account."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            from capstones.models import GroupMember

            advises_student = GroupMember.objects.filter(
                student=target,
                group__adviser=request.user,
                group__status="accepted",
            ).exists()
            if not advises_student:
                return Response(
                    {"detail": "You can only manage students in your own accepted groups."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        target.is_active = bool(is_active)
        if target.is_active and target.approved_at is None:
            target.approved_at = timezone.now()
        target.save(update_fields=["is_active", "approved_at"])
        if not target.is_active:
            LoginSession.objects.filter(user=target, ended_at__isnull=True).update(
                ended_at=timezone.now(),
                end_reason=LoginSession.END_DISABLED,
            )
        return Response(UserSerializer(target).data)


class SchoolYearViewSet(viewsets.ModelViewSet):
    """Admin-managed list of capstone terms. Read access is public so the
    registration page can populate its dropdown before login."""

    queryset = SchoolYear.objects.all()
    serializer_class = SchoolYearSerializer
    permission_classes = [IsAdminOrPublicReadOnly]


class SystemSettingView(APIView):
    """Singleton department settings: default adviser capacity + which
    school year's data is currently displayed in admin views."""

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        return Response(SystemSettingSerializer(SystemSetting.load()).data)

    def patch(self, request):
        settings_obj = SystemSetting.load()
        serializer = SystemSettingSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
