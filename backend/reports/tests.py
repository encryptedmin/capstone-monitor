from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import AdviserProfile, SchoolYear, StudentProfile, SystemSetting, User
from capstones.models import CapstoneGroup, GroupMember


class DepartmentPdfReportTests(APITestCase):
    def test_report_is_served_inline(self):
        user = User.objects.create_user(
            email="report-admin@example.com", password="test-password", role=User.Role.ADMIN
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("report-pdf"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(
            response["Content-Disposition"].startswith(
                'inline; filename="capstone_progress_report.pdf"'
            )
        )

    def test_report_summary_uses_profile_names(self):
        admin = User.objects.create_user(
            email="report-admin@example.com", password="test-password", role=User.Role.ADMIN
        )
        adviser = User.objects.create_user(
            email="faculty01@example.com", password="test-password", role=User.Role.ADVISER
        )
        AdviserProfile.objects.create(user=adviser, full_name="Dr. Ada Reyes")
        student = User.objects.create_user(
            email="student01@example.com", password="test-password", role=User.Role.STUDENT
        )
        StudentProfile.objects.create(user=student, full_name="Maria Santos")
        group = CapstoneGroup.objects.create(
            capstone_title="Smart Campus Monitor",
            adviser=adviser,
        )
        GroupMember.objects.create(group=group, student=student)
        self.client.force_authenticate(user=admin)

        response = self.client.get(reverse("report-analytics"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["per_group"][0]["adviser"], "Dr. Ada Reyes")
        self.assertEqual(response.data["per_group"][0]["members"], "Maria Santos")

    def test_report_summary_can_filter_by_school_year(self):
        admin = User.objects.create_user(
            email="report-admin@example.com", password="test-password", role=User.Role.ADMIN
        )
        year_2026 = SchoolYear.objects.create(
            start_semester=SchoolYear.Semester.SECOND,
            start_year=2026,
            end_semester=SchoolYear.Semester.FIRST,
            end_year=2027,
        )
        year_2028 = SchoolYear.objects.create(
            start_semester=SchoolYear.Semester.SECOND,
            start_year=2028,
            end_semester=SchoolYear.Semester.FIRST,
            end_year=2029,
        )
        CapstoneGroup.objects.create(
            capstone_title="2026 Project",
            school_year=year_2026,
        )
        CapstoneGroup.objects.create(
            capstone_title="2028 Project",
            school_year=year_2028,
        )
        self.client.force_authenticate(user=admin)

        response = self.client.get(reverse("report-analytics"), {"school_year": year_2028.id})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["group_count"], 1)
        self.assertEqual(response.data["per_group"][0]["group"], "2028 Project")

    def test_adviser_report_ignores_admin_display_school_year(self):
        adviser = User.objects.create_user(
            email="faculty01@example.com", password="test-password", role=User.Role.ADVISER
        )
        AdviserProfile.objects.create(user=adviser, full_name="Dr. Ada Reyes")
        year_2026 = SchoolYear.objects.create(
            start_semester=SchoolYear.Semester.SECOND,
            start_year=2026,
            end_semester=SchoolYear.Semester.FIRST,
            end_year=2027,
        )
        year_2028 = SchoolYear.objects.create(
            start_semester=SchoolYear.Semester.SECOND,
            start_year=2028,
            end_semester=SchoolYear.Semester.FIRST,
            end_year=2029,
        )
        setting = SystemSetting.load()
        setting.display_school_year = year_2028
        setting.save(update_fields=["display_school_year"])
        CapstoneGroup.objects.create(
            capstone_title="Faculty Project",
            adviser=adviser,
            school_year=year_2026,
        )
        self.client.force_authenticate(user=adviser)

        response = self.client.get(reverse("report-analytics"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["group_count"], 1)
        self.assertEqual(response.data["per_group"][0]["group"], "Faculty Project")
