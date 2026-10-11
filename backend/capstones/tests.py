from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AdviserProfile, SchoolYear, StudentProfile, SystemSetting, User

from .models import CapstoneGroup, GroupMember


class AdviserPendingRequestTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="password",
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.adviser = User.objects.create_user(
            username="adviser",
            email="adviser@example.com",
            password="password",
            role=User.Role.ADVISER,
            is_active=True,
        )
        AdviserProfile.objects.create(user=self.adviser, full_name="Faculty Adviser")

        self.student = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="password",
            role=User.Role.STUDENT,
            is_active=True,
        )

        self.request_year = SchoolYear.objects.create(
            start_semester=SchoolYear.Semester.FIRST,
            start_year=2026,
            end_semester=SchoolYear.Semester.SECOND,
            end_year=2026,
        )
        self.display_year = SchoolYear.objects.create(
            start_semester=SchoolYear.Semester.FIRST,
            start_year=2027,
            end_semester=SchoolYear.Semester.SECOND,
            end_year=2027,
        )
        StudentProfile.objects.create(
            user=self.student,
            full_name="Student One",
            school_year=self.request_year,
        )
        setting = SystemSetting.load()
        setting.display_school_year = self.display_year
        setting.save(update_fields=["display_school_year"])

        self.group = CapstoneGroup.objects.create(
            adviser=self.adviser,
            requested_by=self.student,
            capstone_title="Pending Capstone",
            status=CapstoneGroup.Status.PENDING,
            school_year=self.request_year,
        )
        GroupMember.objects.create(group=self.group, student=self.student)

    def test_adviser_can_include_pending_requests_outside_display_year(self):
        self.client.force_authenticate(self.adviser)

        response = self.client.get(
            "/api/groups/",
            {"status": "pending"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["capstone_title"], "Pending Capstone")

    def test_adviser_can_accept_pending_request_outside_display_year(self):
        self.client.force_authenticate(self.adviser)

        response = self.client.post(f"/api/groups/{self.group.id}/accept/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.group.refresh_from_db()
        self.assertEqual(self.group.status, CapstoneGroup.Status.ACCEPTED)

    def test_adviser_can_view_accepted_groups_outside_admin_display_year(self):
        self.group.status = CapstoneGroup.Status.ACCEPTED
        self.group.save(update_fields=["status"])
        self.client.force_authenticate(self.adviser)

        response = self.client.get("/api/groups/", {"status": "accepted"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["capstone_title"], "Pending Capstone")

    def test_student_can_view_own_title_statuses_outside_admin_display_year(self):
        self.client.force_authenticate(self.student)

        for group_status in CapstoneGroup.Status.values:
            with self.subTest(group_status=group_status):
                self.group.status = group_status
                self.group.save(update_fields=["status"])

                response = self.client.get("/api/groups/")

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                rows = response.data.get("results", response.data)
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["capstone_title"], "Pending Capstone")
                self.assertEqual(rows[0]["status"], group_status)

    def test_admin_group_list_shows_all_years_by_default(self):
        self.client.force_authenticate(self.admin)
        other_group = CapstoneGroup.objects.create(
            adviser=self.adviser,
            requested_by=self.student,
            capstone_title="Display Year Capstone",
            status=CapstoneGroup.Status.ACCEPTED,
            school_year=self.display_year,
        )

        response = self.client.get("/api/groups/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data)
        titles = {row["capstone_title"] for row in rows}
        self.assertEqual(titles, {"Pending Capstone", other_group.capstone_title})

    def test_admin_group_list_can_filter_by_school_year(self):
        self.client.force_authenticate(self.admin)
        CapstoneGroup.objects.create(
            adviser=self.adviser,
            requested_by=self.student,
            capstone_title="Display Year Capstone",
            status=CapstoneGroup.Status.ACCEPTED,
            school_year=self.display_year,
        )

        response = self.client.get("/api/groups/", {"school_year": self.request_year.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data.get("results", response.data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["capstone_title"], "Pending Capstone")

    def test_capacity_is_counted_per_school_year_when_accepting(self):
        setting = SystemSetting.load()
        setting.default_adviser_capacity = 1
        setting.save(update_fields=["default_adviser_capacity"])
        CapstoneGroup.objects.create(
            adviser=self.adviser,
            requested_by=self.student,
            capstone_title="Previous Year Accepted",
            status=CapstoneGroup.Status.ACCEPTED,
            school_year=self.display_year,
        )
        self.client.force_authenticate(self.adviser)

        response = self.client.post(f"/api/groups/{self.group.id}/accept/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.group.refresh_from_db()
        self.assertEqual(self.group.status, CapstoneGroup.Status.ACCEPTED)

    def test_capacity_still_blocks_when_same_year_is_full(self):
        setting = SystemSetting.load()
        setting.default_adviser_capacity = 1
        setting.save(update_fields=["default_adviser_capacity"])
        CapstoneGroup.objects.create(
            adviser=self.adviser,
            requested_by=self.student,
            capstone_title="Same Year Accepted",
            status=CapstoneGroup.Status.ACCEPTED,
            school_year=self.request_year,
        )
        self.client.force_authenticate(self.adviser)

        response = self.client.post(f"/api/groups/{self.group.id}/accept/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.group.refresh_from_db()
        self.assertEqual(self.group.status, CapstoneGroup.Status.PENDING)

    def test_adviser_directory_counts_student_school_year_only(self):
        setting = SystemSetting.load()
        setting.default_adviser_capacity = 1
        setting.save(update_fields=["default_adviser_capacity"])
        CapstoneGroup.objects.create(
            adviser=self.adviser,
            requested_by=self.student,
            capstone_title="Previous Year Accepted",
            status=CapstoneGroup.Status.ACCEPTED,
            school_year=self.display_year,
        )
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/advisers/directory/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["accepted_count"], 0)
        self.assertTrue(response.data[0]["is_vacant"])

    def test_admin_adviser_status_filters_projects_by_school_year(self):
        self.group.status = CapstoneGroup.Status.ACCEPTED
        self.group.save(update_fields=["status"])
        CapstoneGroup.objects.create(
            adviser=self.adviser,
            requested_by=self.student,
            capstone_title="Display Year Capstone",
            status=CapstoneGroup.Status.ACCEPTED,
            school_year=self.display_year,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get("/api/groups/adviser-status/", {"school_year": self.request_year.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["accepted_count"], 1)
        self.assertEqual(response.data[0]["accepted_groups"][0]["capstone_title"], "Pending Capstone")
