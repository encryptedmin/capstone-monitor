from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Central user table (matches the ERD's Users table). The 'role' field
    drives Role-Based Access Control (RBAC) across the whole system.
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        ADVISER = "adviser", "Faculty Adviser"
        STUDENT = "student", "Student"

    role = models.CharField(max_length=20, choices=Role.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_adviser(self):
        return self.role == self.Role.ADVISER

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT


class StudentProfile(models.Model):
    """Extra fields for students (matches ERD Students table)."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="student_profile"
    )
    full_name = models.CharField(max_length=150)
    section = models.CharField(max_length=50, blank=True)
    school_year = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.full_name


class AdviserProfile(models.Model):
    """Extra fields for faculty advisers (matches ERD Teacher table)."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="adviser_profile"
    )
    full_name = models.CharField(max_length=150)

    def __str__(self):
        return self.full_name
