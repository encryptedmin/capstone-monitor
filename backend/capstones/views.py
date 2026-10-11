from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin, IsAdminOrAdviser, IsStudent
from accounts.serializers import UserSerializer

from .models import CapstoneGroup, GroupMember
from .serializers import (
    AdviserDirectoryEntrySerializer,
    CapstoneGroupDecisionSerializer,
    CapstoneGroupRequestSerializer,
    CapstoneGroupSerializer,
    GroupMemberSerializer,
)


class CapstoneGroupViewSet(viewsets.ModelViewSet):
    """
    Admin: full visibility over all capstone projects ('Manage Capstone
    Projects' use case), with optional explicit school-year filtering.
    Adviser: sees/manages only groups assigned to them; accepts/rejects
    incoming title requests.
    Student: creates their own title+adviser request; read-only afterward.
    """

    def get_serializer_class(self):
        if self.action == "create":
            return CapstoneGroupRequestSerializer
        return CapstoneGroupSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsStudent()]
        if self.action == "adviser_status":
            return [IsAdmin()]
        if self.action == "destroy":
            return [IsAdmin()]
        if self.action in ["update", "partial_update"]:
            return [IsAdminOrAdviser()]
        if self.action in ["accept", "reject"]:
            return [IsAdminOrAdviser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = CapstoneGroup.objects.select_related("adviser", "requested_by", "school_year").prefetch_related(
            "members"
        )
        if user.is_admin:
            pass
        elif user.is_adviser:
            qs = qs.filter(adviser=user)
        elif user.is_student:
            qs = qs.filter(members__student=user)
        else:
            return qs.none()

        status_filter = self.request.query_params.get("status")

        school_year_filter = self.request.query_params.get("school_year")
        if user.is_admin and school_year_filter and school_year_filter != "all":
            qs = qs.filter(school_year_id=school_year_filter)
        if status_filter in CapstoneGroup.Status.values:
            qs = qs.filter(status=status_filter)
        return qs.distinct().order_by("-created_at")

    def perform_update(self, serializer):
        group = self.get_object()
        user = self.request.user
        if user.is_adviser and group.adviser_id != user.id:
            raise PermissionDenied("You can only manage your own assigned groups.")
        serializer.save()

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        group = self.get_object()
        self._check_owns_group(request, group)

        if group.status != CapstoneGroup.Status.PENDING:
            return Response({"detail": "Only a pending request can be accepted."}, status=400)

        profile = getattr(group.adviser, "adviser_profile", None)
        accepted_count = CapstoneGroup.objects.filter(
            adviser=group.adviser,
            status=CapstoneGroup.Status.ACCEPTED,
            school_year=group.school_year,
        ).count()
        if profile is None or accepted_count >= profile.effective_capacity:
            return Response(
                {"detail": "Advisory limit already reached -- cannot accept another group."},
                status=400,
            )

        group.status = CapstoneGroup.Status.ACCEPTED
        group.decided_at = timezone.now()
        group.rejection_reason = ""
        group.save(update_fields=["status", "decided_at", "rejection_reason"])
        return Response(CapstoneGroupSerializer(group).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        group = self.get_object()
        self._check_owns_group(request, group)

        if group.status != CapstoneGroup.Status.PENDING:
            return Response({"detail": "Only a pending request can be rejected."}, status=400)

        serializer = CapstoneGroupDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group.status = CapstoneGroup.Status.REJECTED
        group.rejection_reason = serializer.validated_data.get("rejection_reason", "")
        group.decided_at = timezone.now()
        group.save(update_fields=["status", "rejection_reason", "decided_at"])
        return Response(CapstoneGroupSerializer(group).data)

    @staticmethod
    def _check_owns_group(request, group):
        if request.user.is_admin:
            return
        if request.user.is_adviser and group.adviser_id == request.user.id:
            return
        raise PermissionDenied("You can only decide on requests addressed to you.")

    @action(detail=False, methods=["get"], url_path="adviser-status")
    def adviser_status(self, request):
        school_year_filter = request.query_params.get("school_year")
        advisers = User.objects.filter(role=User.Role.ADVISER).select_related("adviser_profile")
        rows = []

        for adviser in advisers:
            profile = getattr(adviser, "adviser_profile", None)
            capacity = profile.effective_capacity if profile else 0
            accepted_groups = CapstoneGroup.objects.filter(
                adviser=adviser,
                status=CapstoneGroup.Status.ACCEPTED,
            ).select_related("adviser", "requested_by", "school_year").prefetch_related("members")
            if school_year_filter and school_year_filter != "all":
                accepted_groups = accepted_groups.filter(school_year_id=school_year_filter)
            accepted_groups = accepted_groups.order_by("-decided_at", "-created_at")
            accepted_count = accepted_groups.count()

            rows.append(
                {
                    "adviser": UserSerializer(adviser).data,
                    "accepted_groups": CapstoneGroupSerializer(accepted_groups, many=True).data,
                    "capacity": capacity,
                    "accepted_count": accepted_count,
                    "slots_remaining": max(capacity - accepted_count, 0),
                    "is_full": accepted_count >= capacity,
                }
            )

        return Response(rows)


class GroupMemberViewSet(viewsets.ModelViewSet):
    """Enroll/remove students from a capstone group (Admin/Adviser only --
    the requesting student is auto-enrolled when their request is created)."""

    serializer_class = GroupMemberSerializer
    permission_classes = [IsAdminOrAdviser]

    def get_queryset(self):
        user = self.request.user
        qs = GroupMember.objects.select_related("student", "group")
        if user.is_admin:
            return qs
        if user.is_adviser:
            return qs.filter(group__adviser=user)
        return qs.none()


class AdviserDirectoryView(APIView):
    """
    List advisers with their current capacity usage, so a student choosing
    an adviser can see who still has a vacant slot. Only non-full advisers
    are selectable from the frontend, but we return everyone with
    is_vacant so the UI can show "Full" rather than hiding them silently.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        school_year_filter = request.query_params.get("school_year")
        if not school_year_filter and request.user.is_student:
            profile = getattr(request.user, "student_profile", None)
            school_year_filter = getattr(profile, "school_year_id", None)

        advisers = User.objects.filter(role=User.Role.ADVISER, is_active=True).select_related(
            "adviser_profile"
        )
        rows = []
        for adviser in advisers:
            profile = getattr(adviser, "adviser_profile", None)
            if profile is None:
                continue
            accepted_groups = CapstoneGroup.objects.filter(
                adviser=adviser, status=CapstoneGroup.Status.ACCEPTED
            )
            if school_year_filter and school_year_filter != "all":
                accepted_groups = accepted_groups.filter(school_year_id=school_year_filter)
            accepted_count = accepted_groups.count()
            capacity = profile.effective_capacity
            rows.append(
                {
                    "id": adviser.id,
                    "full_name": profile.full_name,
                    "capacity": capacity,
                    "accepted_count": accepted_count,
                    "slots_remaining": max(capacity - accepted_count, 0),
                    "is_vacant": accepted_count < capacity,
                }
            )
        serializer = AdviserDirectoryEntrySerializer(rows, many=True)
        return Response(serializer.data)
