from django.db import models

from capstones.models import CapstoneGroup


class Milestone(models.Model):
    """A checkpoint/phase in a group's capstone development (ERD: Milestones)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        OVERDUE = "overdue", "Overdue"

    group = models.ForeignKey(CapstoneGroup, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    deadline = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        ordering = ["deadline"]

    def __str__(self):
        return f"{self.title} ({self.group})"
