from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AdviserProfile, StudentProfile, User


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ["full_name", "section", "school_year"]


class AdviserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdviserProfile
        fields = ["full_name"]


class UserSerializer(serializers.ModelSerializer):
    """Read-friendly representation, includes nested profile data."""

    student_profile = StudentProfileSerializer(required=False)
    adviser_profile = AdviserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "is_active",
            "created_at",
            "student_profile",
            "adviser_profile",
        ]
        read_only_fields = ["id", "created_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Used by the Administrator's 'Create User' use case. Accepts a flat
    payload and fans profile fields out to the correct child table
    based on role.
    """

    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(write_only=True)
    section = serializers.CharField(write_only=True, required=False, allow_blank=True)
    school_year = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "role",
            "full_name",
            "section",
            "school_year",
        ]

    def create(self, validated_data):
        full_name = validated_data.pop("full_name")
        section = validated_data.pop("section", "")
        school_year = validated_data.pop("school_year", "")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        if user.role == User.Role.STUDENT:
            StudentProfile.objects.create(
                user=user, full_name=full_name, section=section, school_year=school_year
            )
        elif user.role == User.Role.ADVISER:
            AdviserProfile.objects.create(user=user, full_name=full_name)

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
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
