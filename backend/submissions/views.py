from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsAdminOrAdviser, IsStudent
from notifications.utils import notify_group, notify_user

from .models import Feedback, Submission, SubmissionHistory
from .serializers import (
    FeedbackSerializer,
    SubmissionResubmitSerializer,
    SubmissionSerializer,
)

RESUBMITTABLE_STATUSES = (Submission.Status.REJECTED, Submission.Status.REVISION_NEEDED)


class SubmissionViewSet(viewsets.ModelViewSet):
    """
    Student: uploads submissions for their own group ('Submit Capstone
    Documents' use case), and may resubmit (replace the file on) their own
    rejected/revision-needed submission via the `resubmit` action.
    Adviser: reviews and updates status for their assigned groups.
    Admin: full visibility, read-only.
    """

    serializer_class = SubmissionSerializer

    def get_permissions(self):
        if self.action in ["create"]:
            return [IsStudent()]
        if self.action == "resubmit":
            return [IsStudent()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAdminOrAdviser()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = Submission.objects.select_related("group", "milestone").prefetch_related(
            "feedback", "history"
        )
        if user.is_admin:
            return qs
        if user.is_adviser:
            return qs.filter(group__adviser=user)
        if user.is_student:
            return qs.filter(group__members__student=user)
        return qs.none()

    def perform_create(self, serializer):
        group = serializer.validated_data["group"]
        if not self.request.user.is_active:
            raise PermissionDenied("Your account has been disabled. Contact your adviser or the admin.")
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

    @action(detail=True, methods=["post"])
    def resubmit(self, request, pk=None):
        """Student replaces the file on their own rejected/revision-needed
        submission. The old file+status is preserved in SubmissionHistory;
        the live row is reset to 'pending' for the adviser to review again."""
        submission = self.get_object()

        if not request.user.is_active:
            raise PermissionDenied("Your account has been disabled. Contact your adviser or the admin.")
        if not submission.group.members.filter(student=request.user).exists():
            raise PermissionDenied("You are not a member of this capstone group.")
        if submission.status not in RESUBMITTABLE_STATUSES:
            return Response(
                {"detail": "Only a rejected or revision-needed submission can be resubmitted."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        serializer = SubmissionResubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        SubmissionHistory.objects.create(
            submission=submission,
            file=submission.file,
            status=submission.status,
        )

        submission.file = serializer.validated_data["file"]
        submission.status = Submission.Status.PENDING
        submission.resubmission_count += 1
        submission.save(update_fields=["file", "status", "resubmission_count", "updated_at"])

        if submission.group.adviser:
            notify_user(
                submission.group.adviser,
                f"'{submission.group.capstone_title}' resubmitted a milestone for review.",
            )

        return Response(SubmissionSerializer(submission).data)


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
