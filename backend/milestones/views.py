from rest_framework import viewsets

from accounts.permissions import IsAdviser
from notifications.utils import notify_group

from .models import Milestone
from .serializers import MilestoneSerializer


class MilestoneViewSet(viewsets.ModelViewSet):
    """
    Adviser: creates/updates milestones for their assigned groups.
    Student: read-only view of their own group's milestones.
    Admin: read-only full visibility.
    """

    serializer_class = MilestoneSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdviser()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = Milestone.objects.select_related("group")
        if user.is_admin:
            pass
        elif user.is_adviser:
            qs = qs.filter(group__adviser=user)
        elif user.is_student:
            qs = qs.filter(group__members__student=user)
        else:
            return qs.none()
        group_id = self.request.query_params.get("group")
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs

    def perform_create(self, serializer):
        milestone = serializer.save()
        notify_group(
            milestone.group,
            f"New milestone '{milestone.title}' added, due {milestone.deadline:%b %d, %Y}.",
        )

    def perform_update(self, serializer):
        milestone = serializer.save()
        if milestone.status == Milestone.Status.COMPLETED:
            notify_group(milestone.group, f"Milestone '{milestone.title}' marked completed.")
