import uuid

from django.conf import settings
from django.db import models


def title_document_upload_path(instance, filename):
    # Uses a random prefix (not instance.pk) because Django writes the
    # FileField to storage *before* a new row's pk is assigned.
    return f"titles/{uuid.uuid4().hex}_{filename}"


class CapstoneGroup(models.Model):
    """
    A capstone project team (ERD: Groups, renamed to avoid clashing with
    Django's built-in auth.Group).

    Lifecycle: a student submits a title + chosen adviser (status=pending,
    adviser set but not yet "theirs" until accepted). The adviser accepts
    (status=accepted -- counts toward their capacity) or rejects
    (status=rejected, rejection_reason set; the student must then submit a
    fresh request to a different, vacant adviser).
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    adviser = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="advised_groups",
        limit_choices_to={"role": "adviser"},
    )
    capstone_title = models.CharField(max_length=255)
    title_document = models.FileField(upload_to=title_document_upload_path, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    rejection_reason = models.TextField(blank=True)
    school_year = models.ForeignKey(
        "accounts.SchoolYear",
        on_delete=models.PROTECT,
        null=True,
        related_name="groups",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_groups",
        limit_choices_to={"role": "student"},
    )
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.capstone_title


class GroupMember(models.Model):
    """
    Join table linking students to their capstone group (ERD: GroupMembers).

    student is nullable with a name snapshot so that hard-deleting a
    student account (Admin feature) does not erase the historical record
    of who was in the group -- only the live account reference goes away.
    """

    group = models.ForeignKey(CapstoneGroup, on_delete=models.CASCADE, related_name="members")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="group_memberships",
        limit_choices_to={"role": "student"},
    )
    student_name_snapshot = models.CharField(max_length=150, blank=True)

    class Meta:
        unique_together = ("group", "student")

    def __str__(self):
        return f"{self.student_name_snapshot or self.student} in {self.group}"

    def save(self, *args, **kwargs):
        if not self.student_name_snapshot and self.student_id:
            full_name = getattr(getattr(self.student, "student_profile", None), "full_name", "")
            self.student_name_snapshot = full_name or self.student.username
        super().save(*args, **kwargs)
