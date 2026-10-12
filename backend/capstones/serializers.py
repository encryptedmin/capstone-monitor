from django.db import transaction
from rest_framework import serializers

from accounts.models import SchoolYear, StudentProfile, User
from accounts.names import name_key
from accounts.serializers import UserSerializer

from .models import CapstoneGroup, GroupMember

# One capstone = one registered user (the representative who files the
# request). Everyone else is listed by name only. Set MIN_PARTNERS to 0 to
# allow solo capstones.
MIN_PARTNERS = 1
MAX_PARTNERS = 2

ACTIVE_STATUSES = [CapstoneGroup.Status.PENDING, CapstoneGroup.Status.ACCEPTED]


class GroupMemberSerializer(serializers.ModelSerializer):
    student_detail = UserSerializer(source="student", read_only=True)

    class Meta:
        model = GroupMember
        fields = [
            "id",
            "group",
            "student",
            "student_detail",
            "student_name_snapshot",
            "is_listed_partner",
        ]
        read_only_fields = ["student_name_snapshot", "is_listed_partner"]

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

    The requesting student is the group's only registered user. Their
    partners are typed in as `partner_names` and stored as name-only
    GroupMember rows; those people are then blocked from registering (see
    RegisterSerializer) for as long as this group is pending or accepted.
    """

    partner_names = serializers.ListField(
        child=serializers.CharField(max_length=150, allow_blank=False),
        write_only=True,
        allow_empty=MIN_PARTNERS == 0,
        min_length=MIN_PARTNERS,
        max_length=MAX_PARTNERS,
        help_text="Full names of the capstone partner(s) of the requester.",
    )

    class Meta:
        model = CapstoneGroup
        fields = ["id", "capstone_title", "title_document", "adviser", "school_year", "partner_names"]

    def validate_partner_names(self, value):
        cleaned = [" ".join(name.split()) for name in value]
        for name in cleaned:
            if len(name.split()) < 2:
                raise serializers.ValidationError(
                    f"Enter the full name of your partner (first and last name): '{name}'."
                )
        keys = [name_key(n) for n in cleaned]
        if len(set(keys)) != len(keys):
            raise serializers.ValidationError("The same partner is listed more than once.")
        return cleaned

    def _validate_partners(self, partner_names, requester, school_year):
        own_profile = getattr(requester, "student_profile", None)
        own_key = own_profile.name_key if own_profile else name_key(requester.email)
        errors = []
        for name in partner_names:
            key = name_key(name)
            if key == own_key:
                errors.append(f"'{name}' is your own name. List your partner, not yourself.")
            elif StudentProfile.objects.filter(name_key=key).exclude(user=requester).exists():
                errors.append(
                    f"'{name}' already has a registered account. Under the one-capstone-one-account "
                    "rule, partners must not be registered; ask them to contact the administrator."
                )
            elif GroupMember.objects.filter(
                is_listed_partner=True,
                name_key=key,
                group__status__in=ACTIVE_STATUSES,
                group__school_year=school_year,
            ).exists():
                errors.append(f"'{name}' is already listed as a partner in another capstone group this term.")
        if errors:
            raise serializers.ValidationError({"partner_names": errors})

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
        self._validate_partners(attrs.get("partner_names", []), request.user, school_year)
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
        partner_names = validated_data.pop("partner_names", [])
        validated_data["requested_by"] = request.user
        validated_data["status"] = CapstoneGroup.Status.PENDING
        group = CapstoneGroup.objects.create(**validated_data)
        GroupMember.objects.create(group=group, student=request.user)
        GroupMember.objects.bulk_create(
            [
                GroupMember(
                    group=group,
                    student=None,
                    student_name_snapshot=name,
                    name_key=name_key(name),
                    is_listed_partner=True,
                )
                for name in partner_names
            ]
        )
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
