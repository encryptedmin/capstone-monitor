import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    """A per-user alert (ERD: Notifications, extended with a recipient FK
    so each group member gets their own read/unread state)."""

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"To {self.recipient}: {self.message}"


class Announcement(models.Model):
    """
    Admin-authored notice shown to everyone (primarily Students) -- e.g.
    defense schedules, formatting reminders, deadline reminders. Separate
    from Notification, which is a private per-user, system-generated alert.
    """

    title = models.CharField(max_length=255)
    body = models.TextField()
    is_pinned = models.BooleanField(
        default=False, help_text="Pinned announcements are shown first."
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="announcements",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return self.title


def template_upload_path(instance, filename):
    return f"templates/{uuid.uuid4().hex}_{filename}"


class DocumentTemplate(models.Model):
    """
    A downloadable documentation template/instructions file the Admin
    publishes for students (e.g. Chapter 1 format, title-defense checklist).
    """

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=template_upload_path)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_templates",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
