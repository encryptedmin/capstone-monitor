from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import IsAdmin, IsAdminOrAdviser

from .models import CapstoneGroup, GroupMember
from .serializers import CapstoneGroupSerializer, GroupMemberSerializer


class CapstoneGroupViewSet(viewsets.ModelViewSet):
    """
    Admin: full visibility over all capstone projects ('Manage Capstone
    Projects' use case).
    Adviser: sees/manages only groups assigned to them.
    Student: read-only access to their own group.
    """

    serializer_class = CapstoneGroupSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsAdmin()]
        if self.action in ["update", "partial_update"]:
            return [IsAdminOrAdviser()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = CapstoneGroup.objects.select_related("adviser").prefetch_related("members")
        if user.is_admin:
            return qs
        if user.is_adviser:
            return qs.filter(adviser=user)
        if user.is_student:
            return qs.filter(members__student=user)
        return qs.none()

    def perform_update(self, serializer):
        group = self.get_object()
        user = self.request.user
        if user.is_adviser and group.adviser_id != user.id:
            raise PermissionDenied("You can only manage your own assigned groups.")
        serializer.save()


class GroupMemberViewSet(viewsets.ModelViewSet):
    """Enroll/remove students from a capstone group."""

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
