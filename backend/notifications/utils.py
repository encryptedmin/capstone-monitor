"""
Small helpers for firing notifications from other apps (milestones,
submissions) without those apps needing to know about Notification
internals. This is the simple polling-friendly equivalent of the
original design's SignalR real-time push -- the frontend can poll
GET /api/notifications/?is_read=false every few seconds, or this can
later be swapped for Django Channels without changing call sites.
"""

from .models import Notification


def notify_user(user, message):
    if user is None:
        return
    Notification.objects.create(recipient=user, message=message)


def notify_group(group, message):
    """Notify every student member plus the assigned adviser."""
    recipients = [m.student for m in group.members.select_related("student")]
    if group.adviser:
        recipients.append(group.adviser)
    Notification.objects.bulk_create(
        [Notification(recipient=r, message=message) for r in recipients]
    )
