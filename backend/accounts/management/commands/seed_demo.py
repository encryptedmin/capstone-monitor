"""
Populate the database with realistic demo data for development and the
capstone defense.

    python manage.py seed_demo          # add demo data (safe to re-run)
    python manage.py seed_demo --reset  # wipe previous demo data first

Everything created here uses an @ck.edu / @student.ck.edu email (the email
is the login), so --reset only removes seeded records and never touches
real accounts (e.g. the admin).
"""

from datetime import timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from accounts.models import (
    AdviserProfile,
    SchoolYear,
    StudentProfile,
    SystemSetting,
    User,
)
from capstones.models import CapstoneGroup, GroupMember
from milestones.models import Milestone
from notifications.models import Announcement, Notification
from submissions.models import Feedback, Submission

PASSWORD = "Demo@12345"
ADVISER_DOMAIN = "ck.edu"
STUDENT_DOMAIN = "student.ck.edu"


def make_email(full_name, domain):
    """'Prof. Maria Santos' -> maria.santos@ck.edu; 'Juan Dela Cruz' -> juan.delacruz@student.ck.edu"""
    tokens = [t for t in full_name.lower().replace(".", "").split() if t != "prof"]
    return f"{tokens[0]}.{''.join(tokens[1:])}@{domain}"


def demo_users():
    return User.objects.exclude(role=User.Role.ADMIN).filter(
        Q(email__endswith=f"@{ADVISER_DOMAIN}") | Q(email__endswith=f"@{STUDENT_DOMAIN}")
    )

ADVISERS = [
    # key, full name, capacity override
    ("adviser_santos", "Prof. Maria Santos", None),
    ("adviser_reyes", "Prof. Jose Reyes", None),
    ("adviser_cruz", "Prof. Elena Cruz", 2),
    ("adviser_garcia", "Prof. Ramon Garcia", None),
]

# key, full name, section, term ("past" | "current"), state ("active" | "pending" | "disabled")
STUDENTS = [
    # One registered account per capstone (the representative). Partners are
    # listed by name on the group and have no account.
    ("s_dela_cruz", "Juan Dela Cruz", "BSIT-4A", "current", "active"),
    ("s_bautista", "Katrina Bautista", "BSIT-4B", "current", "active"),
    ("s_aquino", "Sofia Aquino", "BSIT-4B", "current", "active"),
    ("s_navarro", "Darren Navarro", "BSIT-4C", "current", "active"),
    ("s_castillo", "Hannah Castillo", "BSIT-4A", "current", "active"),
    ("s_pascual", "Isabel Pascual", "BSIT-4B", "current", "pending"),
    ("s_soriano", "Rico Soriano", "BSIT-4C", "current", "pending"),
    ("s_gonzales", "Leo Gonzales", "BSIT-4B", "current", "disabled"),
    ("p_alvarez", "Nathan Alvarez", "BSIT-4A", "past", "active"),
]

GROUPS = [
    dict(
        title="Barangay Health Records Management System with SMS Reminders",
        adviser="adviser_santos", status="accepted", term="current",
        members=["s_dela_cruz"], partners=["Angela Mendoza", "Carlo Ramos"], plan="on_track",
    ),
    dict(
        title="Smart Inventory and Point-of-Sale System for Small Retail Stores",
        adviser="adviser_santos", status="accepted", term="current",
        members=["s_bautista"], partners=["Miguel Villanueva"], plan="behind",
    ),
    dict(
        title="Web-Based Enrollment and Scheduling System for a Public High School",
        adviser="adviser_reyes", status="accepted", term="current",
        members=["s_aquino"], partners=["Paolo Torres", "Bianca Flores"], plan="ahead",
    ),
    dict(
        title="Campus Lost-and-Found Mobile App with Image Matching",
        adviser="adviser_cruz", status="accepted", term="current",
        members=["s_navarro"], partners=["Elise Navarro"], plan="early",
    ),
    dict(
        title="IoT-Based Water Quality Monitoring Dashboard for Fish Farms",
        adviser="adviser_garcia", status="pending", term="current",
        members=["s_castillo"], partners=["Ethan Lim"], plan=None,
    ),
    dict(
        title="Online Library Borrowing System",
        adviser="adviser_reyes", status="rejected", term="current",
        members=[], plan=None, requested_by="s_castillo",
        reason="The scope overlaps with an existing campus library system. "
        "Please propose a topic with a clearer research problem and submit again.",
    ),
    dict(
        title="Alumni Tracer and Job Matching Portal",
        adviser="adviser_santos", status="accepted", term="past",
        members=["p_alvarez"], partners=["Clarisse Domingo", "Marco Estrada"], plan="finished",
    ),
]

# (title, description, days after the group's start date)
MILESTONE_TEMPLATE = [
    ("Chapter 1: Introduction", "Background of the study, problem statement, objectives, scope and limitations.", 0),
    ("Chapter 2: Review of Related Literature", "Related studies, systems, and the conceptual framework.", 21),
    ("Chapter 3: Methodology", "Development model, system design, data-gathering and testing plan.", 42),
    ("Title Defense / Proposal Presentation", "Panel presentation of Chapters 1-3.", 63),
    ("System Prototype / Alpha Build", "Working prototype covering the core modules.", 91),
    ("Chapter 4: Results and Discussion", "Test results, user evaluation, and analysis.", 119),
    ("Final Defense", "Final panel defense with the complete system and manuscript.", 147),
]

# start: days from today the group's first milestone window opens.
# subs: submission status for each milestone, in order. Milestones past the
# end of the list have no submission yet.
PLANS = {
    "early": dict(start=-5, subs=["pending"]),
    "on_track": dict(start=-50, subs=["approved", "approved", "revision_needed"]),
    "behind": dict(start=-80, subs=["approved", "revision_needed"]),
    "ahead": dict(start=-95, subs=["approved", "approved", "approved", "approved", "pending"]),
    "finished": dict(start=-420, subs=["approved"] * 7),
}

FEEDBACK = {
    "approved": [
        "Well structured. The objectives are measurable and aligned with the problem statement. Approved.",
        "Good work. Citations are consistent and the framework is clear. You may proceed.",
        "Complete and meets the department format. Approved.",
    ],
    "revision_needed": [
        "Please revise the scope and limitations; they are too broad for one semester. Also fix the APA citations.",
        "The methodology does not explain how respondents were chosen. Add the sampling technique and resubmit.",
    ],
}

ANNOUNCEMENTS = [
    ("Capstone Title Defense Schedule",
     "Title defenses will be held on the third week of November at the ITE Conference Room. "
     "Groups will be notified of their slot by their adviser. Bring three printed copies of Chapters 1-3.", True),
    ("Manuscript Formatting Reminder",
     "All manuscripts must use Arial 11, 1.5 line spacing, and 1-inch margins. "
     "Download the latest Chapter template from the Documents page.", True),
    ("Adviser Consultation Hours",
     "Advisers are available for consultation Tuesdays and Thursdays, 1:00-4:00 PM. "
     "Please message your adviser to book a slot.", False),
    ("Reminder: Submit Milestones Early",
     "Deadlines are strict. Submit at least one day early so your adviser has time to review.", False),
]


class Command(BaseCommand):
    help = "Seed the database with demo advisers, student representatives, groups, milestones, submissions and announcements."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete previously seeded demo data first.")

    @transaction.atomic
    def handle(self, *args, **opts):
        if opts["reset"]:
            self._reset()
        elif demo_users().exists():
            self.stdout.write(self.style.WARNING("Demo data already exists. Use --reset to rebuild it."))
            return

        now = timezone.now()
        admin = User.objects.filter(role=User.Role.ADMIN).order_by("id").first()
        if admin is None:
            admin = User.objects.create_superuser("admin@email.com", PASSWORD)
            self.stdout.write(f"Created admin admin@email.com / {PASSWORD}")

        terms = self._terms()
        advisers = self._advisers(now)
        students = self._students(now, terms)

        system = SystemSetting.load()
        system.default_adviser_capacity = 3
        system.display_school_year = None
        system.save()

        for spec in GROUPS:
            self._group(spec, now, terms, advisers, students)

        self._announcements(admin, now)
        self._notifications(now)

        self.stdout.write(self.style.SUCCESS("Demo data created."))
        self.stdout.write(f"All demo accounts use password: {PASSWORD}")
        self.stdout.write("  Login with the email address:")
        self.stdout.write("  advisers: " + ", ".join(make_email(a[1], ADVISER_DOMAIN) for a in ADVISERS))
        self.stdout.write(
            "  students (one per capstone; partners are name-only): "
            + ", ".join(
                f"{make_email(st[1], STUDENT_DOMAIN)} ({label})"
                for st, label in [
                    (STUDENTS[0], "on track"), (STUDENTS[1], "behind"), (STUDENTS[2], "ahead"),
                    (STUDENTS[4], "pending title"), (STUDENTS[5], "pending approval"),
                    (STUDENTS[7], "disabled"),
                ]
            )
        )

    def _reset(self):
        users = demo_users()
        # Groups reference users with SET_NULL, so remove them explicitly.
        CapstoneGroup.objects.filter(members__student__in=users).distinct().delete()
        CapstoneGroup.objects.filter(requested_by__in=users).delete()
        Announcement.objects.filter(title__in=[a[0] for a in ANNOUNCEMENTS]).delete()
        users.delete()
        self.stdout.write("Removed previous demo data.")

    def _terms(self):
        past, _ = SchoolYear.objects.get_or_create(
            start_semester=1, start_year=2025, end_semester=2, end_year=2025)
        current, _ = SchoolYear.objects.get_or_create(
            start_semester=1, start_year=2026, end_semester=2, end_year=2026)
        current.is_active = True
        current.save()  # save() deactivates every other term
        return {"past": past, "current": current}

    def _advisers(self, now):
        out = {}
        for key, name, cap in ADVISERS:
            user = User.objects.create_user(
                make_email(name, ADVISER_DOMAIN), PASSWORD,
                role=User.Role.ADVISER, approved_at=now - timedelta(days=200))
            AdviserProfile.objects.create(user=user, full_name=name, capacity_override=cap)
            out[key] = user
        return out

    def _students(self, now, terms):
        out = {}
        for key, name, section, term, state in STUDENTS:
            user = User.objects.create_user(
                make_email(name, STUDENT_DOMAIN), PASSWORD,
                role=User.Role.STUDENT,
                is_active=state == "active",
                approved_at=None if state == "pending" else now - timedelta(days=60))
            StudentProfile.objects.create(
                user=user, full_name=name, section=section, school_year=terms[term])
            out[key] = user
        return out

    def _group(self, spec, now, terms, advisers, students):
        status = spec["status"]
        adviser = advisers[spec["adviser"]]
        members = spec["members"]
        requested_by = students[spec.get("requested_by") or members[0]]
        if spec["plan"]:
            created = now + timedelta(days=PLANS[spec["plan"]]["start"] - 7)
        else:
            created = now - timedelta(days=3)

        group = CapstoneGroup.objects.create(
            adviser=adviser,
            capstone_title=spec["title"],
            status=status,
            rejection_reason=spec.get("reason", ""),
            school_year=terms[spec["term"]],
            requested_by=requested_by,
            decided_at=None if status == "pending" else created + timedelta(days=4),
        )
        # created_at is auto_now_add, so backdate it with an update.
        CapstoneGroup.objects.filter(pk=group.pk).update(created_at=created)
        for key in members:
            GroupMember.objects.create(group=group, student=students[key])
        for partner in spec.get("partners", []):
            GroupMember.objects.create(
                group=group, student=None, student_name_snapshot=partner, is_listed_partner=True)

        if spec["plan"]:
            self._milestones(group, spec["plan"], now, adviser)

    def _milestones(self, group, plan_key, now, adviser):
        plan = PLANS[plan_key]
        start = now + timedelta(days=plan["start"])
        subs = plan["subs"]
        for i, (title, desc, offset) in enumerate(MILESTONE_TEMPLATE):
            deadline = start + timedelta(days=offset + 7)
            sub_status = subs[i] if i < len(subs) else None
            if sub_status == "approved":
                status = Milestone.Status.COMPLETED
            elif sub_status == "pending":
                status = Milestone.Status.IN_PROGRESS  # submitted on time, awaiting review
            elif sub_status is not None or i == len(subs):
                status = Milestone.Status.OVERDUE if deadline < now else Milestone.Status.IN_PROGRESS
            else:
                status = Milestone.Status.OVERDUE if deadline < now else Milestone.Status.PENDING
            milestone = Milestone.objects.create(
                group=group, title=title, description=desc, deadline=deadline, status=status)

            if sub_status is None:
                continue
            submitted_at = min(deadline - timedelta(days=1), now - timedelta(hours=6))
            submission = Submission(
                group=group, milestone=milestone, status=sub_status,
                resubmission_count=1 if sub_status == "approved" and i == 1 else 0)
            filename = title.split(":")[0].replace(" ", "_").replace("/", "-") + ".txt"
            submission.file.save(
                filename,
                ContentFile(f"Demo placeholder for '{title}'\n{group.capstone_title}\n".encode()),
                save=False)
            submission.save()
            Submission.objects.filter(pk=submission.pk).update(
                submitted_at=submitted_at, updated_at=submitted_at + timedelta(days=2))

            comments = FEEDBACK.get(sub_status)
            if comments:
                fb = Feedback.objects.create(
                    submission=submission, adviser=adviser, comment=comments[i % len(comments)])
                Feedback.objects.filter(pk=fb.pk).update(created_at=submitted_at + timedelta(days=2))

    def _announcements(self, admin, now):
        for i, (title, body, pinned) in enumerate(ANNOUNCEMENTS):
            a = Announcement.objects.create(title=title, body=body, is_pinned=pinned, posted_by=admin)
            Announcement.objects.filter(pk=a.pk).update(created_at=now - timedelta(days=i * 3 + 1))

    def _notifications(self, now):
        def send(user, msg, hours_ago, read=False):
            n = Notification.objects.create(recipient=user, message=msg, is_read=read)
            Notification.objects.filter(pk=n.pk).update(created_at=now - timedelta(hours=hours_ago))

        for g in CapstoneGroup.objects.filter(school_year__is_active=True):
            if g.status == "pending":
                send(g.adviser, f"New capstone title request awaiting your review: {g.capstone_title}", 20)
            elif g.status == "accepted":
                adviser_name = g.adviser.adviser_profile.full_name
                overdue = g.milestones.filter(status="overdue").first()
                revision = g.submissions.filter(status="revision_needed").select_related("milestone").first()
                for m in g.members.select_related("student").filter(student__isnull=False):
                    send(m.student, f"Your capstone title was accepted by {adviser_name}.", 24 * 20, read=True)
                    if overdue:
                        send(m.student, f"Milestone overdue: {overdue.title}", 5)
                    if revision:
                        send(m.student, f"Revision requested on '{revision.milestone.title}'.", 30)
                pending = g.submissions.filter(status="pending").select_related("milestone").first()
                if pending:
                    send(g.adviser, f"New submission for review: {pending.milestone.title} ({g.capstone_title})", 8)
