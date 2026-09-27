from django.conf import settings
from django.db import models

from capstones.models import CapstoneGroup
from milestones.models import Milestone


def submission_upload_path(instance, filename):
    return f"submissions/group_{instance.group_id}/{filename}"


class Submission(models.Model):
    """A document/file a group submits against a milestone (ERD: Submissions)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Review"
        APPROVED = "approved", "Approved"
        REVISION_NEEDED = "revision_needed", "Revision Needed"
        REJECTED = "rejected", "Rejected"

    group = models.ForeignKey(CapstoneGroup, on_delete=models.CASCADE, related_name="submissions")
    milestone = models.ForeignKey(
        Milestone, on_delete=models.CASCADE, related_name="submissions"
    )
    file = models.FileField(upload_to=submission_upload_path)
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Submission for {self.milestone} ({self.group})"


class Feedback(models.Model):
    """Adviser feedback/comments tied to a specific submission."""

    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="feedback")
    adviser = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={"role": "adviser"},
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Feedback on {self.submission}"
