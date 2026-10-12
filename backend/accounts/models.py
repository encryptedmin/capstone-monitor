import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from .names import name_key


class UserManager(BaseUserManager):
    """Email-based manager. Emails are stored lowercase and looked up
    case-insensitively, so 'Juan@CK.edu' and 'juan@ck.edu' are one account."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", "admin")
        extra.setdefault("approved_at", timezone.now())
        return self._create_user(email, password, **extra)

    def get_by_natural_key(self, email):
        return self.get(email__iexact=email)


class User(AbstractUser):
    """
    Central user table (matches the ERD's Users table). The 'role' field
    drives Role-Based Access Control (RBAC) across the whole system.

    There is no username: the email address is the login identifier.

    Account lifecycle:
      - Students self-register -> created with is_active=False,
        approved_at=None ("pending approval").
      - Advisers are created by an admin -> created active/approved.
      - Admin approves -> is_active=True, approved_at set.
      - Admin or the student's own Adviser can later disable the account
        (is_active=False) without deleting it; approved_at stays set, which
        is how the API/UI tells "pending" apart from "disabled".
      - Admin can hard-delete a User outright; capstone files/submissions
        are NOT cascaded away (see capstones/submissions models).
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        ADVISER = "adviser", "Faculty Adviser"
        STUDENT = "student", "Student"

    username = None
    email = models.EmailField(
        "email address",
        unique=True,
        error_messages={"unique": "An account with this email address already exists."},
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Set the first time an admin approves this account. "
        "Null means the account has never been approved (pending).",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_adviser(self):
        return self.role == self.Role.ADVISER

    @property
    def is_student(self):
        return self.role == self.Role.STUDENT

    @property
    def account_status(self):
        """pending | active | disabled -- convenience for the API/UI."""
        if self.is_active:
            return "active"
        if self.approved_at is None:
            return "pending"
        return "disabled"


class SchoolYear(models.Model):
    """
    A capstone term. Capstone work spans two semesters that straddle an
    academic-year boundary (e.g. Capstone 1 in the 2nd Semester of AY
    2026-2027, Capstone 2 in the 1st Semester of AY 2027-2028), so a term
    is stored as a start (semester + AY) and an end (semester + AY) rather
    than a single AY string.
    """

    class Semester(models.IntegerChoices):
        FIRST = 1, "1st Semester"
        SECOND = 2, "2nd Semester"

    start_semester = models.PositiveSmallIntegerField(choices=Semester.choices)
    start_year = models.PositiveIntegerField(
        help_text="First calendar year of the starting AY, e.g. 2026 for AY 2026-2027."
    )
    end_semester = models.PositiveSmallIntegerField(choices=Semester.choices)
    end_year = models.PositiveIntegerField(
        help_text="First calendar year of the ending AY, e.g. 2027 for AY 2027-2028."
    )
    is_active = models.BooleanField(
        default=False,
        help_text="Currently open for new student registration and title requests. "
        "Only one term should be active at a time.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_year", "-start_semester"]
        unique_together = ("start_semester", "start_year", "end_semester", "end_year")

    def __str__(self):
        return self.label

    @staticmethod
    def _semester_label(sem):
        return "1st" if sem == SchoolYear.Semester.FIRST else "2nd"

    @property
    def label(self):
        return (
            f"{self._semester_label(self.start_semester)} Semester AY "
            f"{self.start_year}-{self.start_year + 1} – "
            f"{self._semester_label(self.end_semester)} Semester AY "
            f"{self.end_year}-{self.end_year + 1}"
        )

    @property
    def sort_key(self):
        return (self.start_year, self.start_semester)

    def clean(self):
        start_key = self.start_year * 2 + (self.start_semester - 1)
        end_key = self.end_year * 2 + (self.end_semester - 1)
        if end_key <= start_key:
            raise ValidationError(
                "The ending semester/AY must come chronologically after the starting one."
            )

    def save(self, *args, **kwargs):
        if self.is_active:
            # Only one term is "open" for registration at a time.
            SchoolYear.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class LoginSession(models.Model):
    """
    Server-side session anchor for JWTs. A token is only accepted while its
    session row is still active and belongs to the current backend process.
    """

    END_REPLACED = "replaced"
    END_LOGOUT = "logout"
    END_SERVER_RESTART = "server_restart"
    END_DISABLED = "account_disabled"
    END_CHOICES = [
        (END_REPLACED, "Replaced by a newer login on this device"),
        (END_LOGOUT, "Logged out"),
        (END_SERVER_RESTART, "Invalidated after server restart"),
        (END_DISABLED, "Account disabled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="login_sessions"
    )
    device_id = models.CharField(max_length=64, db_index=True)
    server_instance_id = models.CharField(max_length=32, db_index=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True, db_index=True)
    end_reason = models.CharField(max_length=32, choices=END_CHOICES, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["device_id"],
                condition=Q(ended_at__isnull=True),
                name="one_active_login_per_device",
            )
        ]
        indexes = [
            models.Index(fields=["user", "device_id", "ended_at"]),
            models.Index(fields=["server_instance_id", "ended_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} on {self.device_id}"

    @property
    def is_active(self):
        return self.ended_at is None

    @classmethod
    def start(cls, user, device_id, user_agent=""):
        now = timezone.now()
        cls.objects.filter(device_id=device_id, ended_at__isnull=True).update(
            ended_at=now,
            end_reason=cls.END_REPLACED,
        )
        return cls.objects.create(
            user=user,
            device_id=device_id,
            server_instance_id=settings.SESSION_SERVER_INSTANCE_ID,
            user_agent=user_agent[:255],
        )

    def end(self, reason=END_LOGOUT):
        if self.ended_at is None:
            self.ended_at = timezone.now()
            self.end_reason = reason
            self.save(update_fields=["ended_at", "end_reason"])

    def touch(self):
        self.last_seen_at = timezone.now()
        self.save(update_fields=["last_seen_at"])


class SystemSetting(models.Model):
    """Singleton row holding department-wide configuration."""

    default_adviser_capacity = models.PositiveIntegerField(
        default=5,
        help_text="Default max number of accepted capstone groups per adviser, "
        "unless a specific adviser has their own override.",
    )
    display_school_year = models.ForeignKey(
        SchoolYear,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="When set, dashboards/reports system-wide only show data for this "
        "term. Leave blank to show all terms.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"

    def __str__(self):
        return "System Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class StudentProfile(models.Model):
    """Extra fields for students (matches ERD Students table)."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="student_profile"
    )
    full_name = models.CharField(max_length=150)
    name_key = models.CharField(max_length=200, blank=True, db_index=True, editable=False)
    section = models.CharField(max_length=50, blank=True)
    school_year = models.ForeignKey(
        SchoolYear,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="students",
    )

    def __str__(self):
        return self.full_name

    def save(self, *args, **kwargs):
        self.name_key = name_key(self.full_name)
        super().save(*args, **kwargs)


class AdviserProfile(models.Model):
    """Extra fields for faculty advisers (matches ERD Teacher table)."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="adviser_profile"
    )
    full_name = models.CharField(max_length=150)
    capacity_override = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Overrides the system default adviser capacity for this adviser. "
        "Leave blank to use the department default.",
    )

    def __str__(self):
        return self.full_name

    @property
    def effective_capacity(self):
        if self.capacity_override is not None:
            return self.capacity_override
        return SystemSetting.load().default_adviser_capacity
