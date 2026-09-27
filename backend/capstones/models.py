from django.conf import settings
from django.db import models


class CapstoneGroup(models.Model):
    """A capstone project team (ERD: Groups, renamed to avoid clashing
    with Django's built-in auth.Group)."""

    adviser = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="advised_groups",
        limit_choices_to={"role": "adviser"},
    )
    capstone_title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.capstone_title


class GroupMember(models.Model):
    """Join table linking students to their capstone group (ERD: GroupMembers)."""

    group = models.ForeignKey(CapstoneGroup, on_delete=models.CASCADE, related_name="members")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_memberships",
        limit_choices_to={"role": "student"},
    )

    class Meta:
        unique_together = ("group", "student")

    def __str__(self):
        return f"{self.student} in {self.group}"
