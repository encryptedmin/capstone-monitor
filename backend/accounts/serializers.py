from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AdviserProfile, LoginSession, SchoolYear, StudentProfile, SystemSetting, User


class SchoolYearSerializer(serializers.ModelSerializer):
    label = serializers.ReadOnlyField()

    class Meta:
        model = SchoolYear
        fields = [
            "id",
            "label",
            "start_semester",
            "start_year",
            "end_semester",
            "end_year",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        start_semester = attrs.get("start_semester", getattr(self.instance, "start_semester", None))
        start_year = attrs.get("start_year", getattr(self.instance, "start_year", None))
        end_semester = attrs.get("end_semester", getattr(self.instance, "end_semester", None))
        end_year = attrs.get("end_year", getattr(self.instance, "end_year", None))
        start_key = start_year * 2 + (start_semester - 1)
        end_key = end_year * 2 + (end_semester - 1)
        if end_key <= start_key:
            raise serializers.ValidationError(
                "The ending semester/AY must come chronologically after the starting one."
            )
        return attrs


class SystemSettingSerializer(serializers.ModelSerializer):
    display_school_year_label = serializers.CharField(
        source="display_school_year.label", read_only=True, default=None
    )

    class Meta:
        model = SystemSetting
        fields = [
            "default_adviser_capacity",
            "display_school_year",
            "display_school_year_label",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class StudentProfileSerializer(serializers.ModelSerializer):
    school_year_label = serializers.CharField(source="school_year.label", read_only=True, default=None)

    class Meta:
        model = StudentProfile
        fields = ["full_name", "section", "school_year", "school_year_label"]


class AdviserProfileSerializer(serializers.ModelSerializer):
    effective_capacity = serializers.ReadOnlyField()

    class Meta:
        model = AdviserProfile
        fields = ["full_name", "capacity_override", "effective_capacity"]


class UserSerializer(serializers.ModelSerializer):
    """Read-friendly representation, includes nested profile data."""

    student_profile = StudentProfileSerializer(required=False)
    adviser_profile = AdviserProfileSerializer(required=False)
    account_status = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "is_active",
            "approved_at",
            "account_status",
            "created_at",
            "student_profile",
            "adviser_profile",
        ]
        read_only_fields = ["id", "created_at", "approved_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Used by the Administrator's 'Create User' use case. Admins create
    adviser accounts only; students must self-register publicly.
    Admin-created adviser accounts are auto-approved.
    """

    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "role",
            "full_name",
        ]

    def validate_role(self, value):
        if value != User.Role.ADVISER:
            raise serializers.ValidationError("Administrators can only create adviser accounts.")
        return value

    def create(self, validated_data):
        full_name = validated_data.pop("full_name")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.is_active = True
        user.approved_at = timezone.now()
        user.save()

        AdviserProfile.objects.create(user=user, full_name=full_name)

        return user


class RegisterSerializer(serializers.ModelSerializer):
    """
    Public self-registration for students. Creates the account in a
    "pending" state (is_active=False, approved_at=None); an admin must
    approve it before the user can log in. Adviser accounts are created by
    administrators.
    """

    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(write_only=True)
    section = serializers.CharField(write_only=True, required=False, allow_blank=True)
    school_year = serializers.PrimaryKeyRelatedField(
        queryset=SchoolYear.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "confirm_password",
            "role",
            "full_name",
            "section",
            "school_year",
        ]

    def validate_role(self, value):
        if value != User.Role.STUDENT:
            raise serializers.ValidationError("Only student accounts can self-register.")
        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.pop("confirm_password", None):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if attrs.get("role") == User.Role.STUDENT and not attrs.get("school_year"):
            raise serializers.ValidationError({"school_year": "School year/term is required for students."})
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop("full_name")
        section = validated_data.pop("section", "")
        school_year = validated_data.pop("school_year", None)
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.is_active = False
        user.approved_at = None
        user.save()

        StudentProfile.objects.create(
            user=user, full_name=full_name, section=section, school_year=school_year
        )

        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Embeds role + id into the JWT so the frontend can route by role
    without an extra round trip."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def validate(self, attrs):
        super().validate(attrs)

        request = self.context.get("request")
        device_id = ""
        user_agent = ""
        if request is not None:
            device_id = request.data.get("device_id", "")
            user_agent = request.META.get("HTTP_USER_AGENT", "")

        if not isinstance(device_id, str) or not device_id.strip():
            raise serializers.ValidationError({"device_id": "Device id is required."})

        device_id = device_id.strip()
        if len(device_id) > 64:
            raise serializers.ValidationError({"device_id": "Device id is too long."})

        with transaction.atomic():
            session = LoginSession.start(self.user, device_id, user_agent=user_agent)

        refresh = self.get_token(self.user)
        refresh["sid"] = str(session.id)
        refresh["did"] = session.device_id
        refresh["srv"] = settings.SESSION_SERVER_INSTANCE_ID

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(self.user).data,
        }


class StrictTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        self._validate_session(refresh)
        return super().validate(attrs)

    def _validate_session(self, refresh):
        session_id = refresh.get("sid")
        device_id = refresh.get("did")
        server_instance_id = refresh.get("srv")

        if not session_id or not device_id or not server_instance_id:
            raise InvalidToken("Token is missing session information.")

        try:
            session = LoginSession.objects.get(id=session_id, device_id=device_id)
        except LoginSession.DoesNotExist as exc:
            raise InvalidToken("Session is no longer active.") from exc

        if session.server_instance_id != settings.SESSION_SERVER_INSTANCE_ID:
            session.end(LoginSession.END_SERVER_RESTART)
            raise InvalidToken("Session expired after server restart.")

        if server_instance_id != settings.SESSION_SERVER_INSTANCE_ID:
            session.end(LoginSession.END_SERVER_RESTART)
            raise InvalidToken("Session expired after server restart.")

        if not session.is_active:
            raise InvalidToken("Session is no longer active.")

        session.touch()
