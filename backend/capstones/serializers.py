from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserSerializer

from .models import CapstoneGroup, GroupMember


class GroupMemberSerializer(serializers.ModelSerializer):
    student_detail = UserSerializer(source="student", read_only=True)

    class Meta:
        model = GroupMember
        fields = ["id", "group", "student", "student_detail"]

    def validate_student(self, value):
        if value.role != User.Role.STUDENT:
            raise serializers.ValidationError("Selected user is not a student.")
        return value


class CapstoneGroupSerializer(serializers.ModelSerializer):
    adviser_detail = UserSerializer(source="adviser", read_only=True)
    members = GroupMemberSerializer(many=True, read_only=True)
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = CapstoneGroup
        fields = [
            "id",
            "capstone_title",
            "adviser",
            "adviser_detail",
            "created_at",
            "members",
            "member_count",
        ]
