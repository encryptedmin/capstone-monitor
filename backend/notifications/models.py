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
