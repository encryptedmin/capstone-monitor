from django.db import transaction
from rest_framework import serializers

from accounts.models import SchoolYear, User
from accounts.serializers import UserSerializer

from .models import CapstoneGroup, GroupMember


class GroupMemberSerializer(serializers.ModelSerializer):
    student_detail = UserSerializer(source="student", read_only=True)

    class Meta:
        model = GroupMember
        fields = ["id", "group", "student", "student_detail", "student_name_snapshot"]
        read_only_fields = ["student_name_snapshot"]

    def validate_student(self, value):
        if value.role != User.Role.STUDENT:
            raise serializers.ValidationError("Selected user is not a student.")
        return value


class CapstoneGroupSerializer(serializers.ModelSerializer):
    """Read/general-purpose representation. Admin/Adviser use this for
    listing, and for the accept/reject actions below."""

    adviser_detail = UserSerializer(source="adviser", read_only=True)
    requested_by_detail = UserSerializer(source="requested_by", read_only=True)
    members = GroupMemberSerializer(many=True, read_only=True)
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    milestones_total = serializers.SerializerMethodField()
    milestones_completed = serializers.SerializerMethodField()
    school_year_label = serializers.CharField(source="school_year.label", read_only=True, default=None)

    class Meta:
        model = CapstoneGroup
        fields = [
            "id",
            "capstone_title",
            "title_document",
            "status",
            "rejection_reason",
            "adviser",
            "adviser_detail",
            "requested_by",
            "requested_by_detail",
            "school_year",
            "school_year_label",
            "created_at",
            "decided_at",
            "members",
            "member_count",
            "milestones_total",
            "milestones_completed",
        ]
        read_only_fields = [
            "status",
            "rejection_reason",
            "requested_by",
            "created_at",
            "decided_at",
        ]

    def get_milestones_total(self, obj):
        return obj.milestones.count()

    def get_milestones_completed(self, obj):
        return obj.milestones.filter(status="completed").count()


class CapstoneGroupRequestSerializer(serializers.ModelSerializer):
    """
    Student-facing 'pick an adviser + upload title document' request.
    Enforces: one active (pending/accepted) request per student per term,
    and the chosen adviser must still have a free capacity slot.
    """

    class Meta:
        model = CapstoneGroup
        fields = ["id", "capstone_title", "title_document", "adviser", "school_year"]

    def validate_adviser(self, value):
        if value.role != User.Role.ADVISER:
            raise serializers.ValidationError("Selected user is not an adviser.")
        profile = getattr(value, "adviser_profile", None)
        if profile is None:
            raise serializers.ValidationError("This adviser has no profile configured.")
        return value

    def validate_school_year(self, value):
        if value is None:
            raise serializers.ValidationError("No active school year/term is configured. Contact the admin.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        school_year = attrs.get("school_year")
        adviser = attrs.get("adviser")
        has_active_request = GroupMember.objects.filter(
            student=request.user,
            group__status__in=[CapstoneGroup.Status.PENDING, CapstoneGroup.Status.ACCEPTED],
            group__school_year=school_year,
        ).exists()
        if has_active_request:
            raise serializers.ValidationError(
                "You already have a pending or accepted capstone group for this term."
            )
        profile = getattr(adviser, "adviser_profile", None)
        accepted_count = CapstoneGroup.objects.filter(
            adviser=adviser,
            status=CapstoneGroup.Status.ACCEPTED,
            school_year=school_year,
        ).count()
        if profile is None or accepted_count >= profile.effective_capacity:
            raise serializers.ValidationError(
                {"adviser": "This adviser has reached their advisory limit for this term. Please choose another adviser."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        validated_data["requested_by"] = request.user
        validated_data["status"] = CapstoneGroup.Status.PENDING
        group = CapstoneGroup.objects.create(**validated_data)
        GroupMember.objects.create(group=group, student=request.user)
        return group


class CapstoneGroupDecisionSerializer(serializers.Serializer):
    """Used by the adviser's accept/reject actions."""

    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class AdviserDirectoryEntrySerializer(serializers.Serializer):
    """One row of the 'vacant advisers' list a student sees when choosing
    an adviser."""

    id = serializers.IntegerField()
    full_name = serializers.CharField()
    capacity = serializers.IntegerField()
    accepted_count = serializers.IntegerField()
    slots_remaining = serializers.IntegerField()
    is_vacant = serializers.BooleanField()
