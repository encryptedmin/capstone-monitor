from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import IsAdminOrAdviser, IsStudent
from notifications.utils import notify_group, notify_user

from .models import Feedback, Submission
from .serializers import FeedbackSerializer, SubmissionSerializer


class SubmissionViewSet(viewsets.ModelViewSet):
    """
    Student: uploads submissions for their own group ('Submit Capstone
    Documents' use case).
    Adviser: reviews and updates status for their assigned groups.
    Admin: full visibility, read-only.
    """

    serializer_class = SubmissionSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsStudent()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAdminOrAdviser()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related("group", "milestone").prefetch_related("feedback")
        if user.is_admin:
            return qs
        if user.is_adviser:
            return qs.filter(group__adviser=user)
        if user.is_student:
            return qs.filter(group__members__student=user)
        return qs.none()

    def perform_create(self, serializer):
        group = serializer.validated_data["group"]
        if not group.members.filter(student=self.request.user).exists():
            raise PermissionDenied("You are not a member of this capstone group.")
        submission = serializer.save()
        if group.adviser:
            notify_user(group.adviser, f"New submission uploaded for '{group.capstone_title}'.")

    def perform_update(self, serializer):
        submission = serializer.save()
        notify_group(
            submission.group,
            f"Submission status updated to '{submission.get_status_display()}'.",
        )


class FeedbackViewSet(viewsets.ModelViewSet):
    """Advisers leave feedback on a student's submission."""

    serializer_class = FeedbackSerializer
    permission_classes = [IsAdminOrAdviser]

    def get_queryset(self):
        user = self.request.user
        qs = Feedback.objects.select_related("submission", "adviser")
        if user.is_admin:
            return qs
        return qs.filter(submission__group__adviser=user)

    def perform_create(self, serializer):
        feedback = serializer.save(adviser=self.request.user)
        notify_group(feedback.submission.group, "New adviser feedback has been posted.")
