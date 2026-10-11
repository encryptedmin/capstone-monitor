from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AdviserProfile, LoginSession, SchoolYear, StudentProfile, User


class AccountCreationPolicyTests(APITestCase):
    def setUp(self):
        self.school_year = SchoolYear.objects.create(
            start_semester=SchoolYear.Semester.SECOND,
            start_year=2026,
            end_semester=SchoolYear.Semester.FIRST,
            end_year=2027,
            is_active=True,
        )

    def test_public_registration_allows_students_only(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "student1",
                "email": "student1@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
                "role": "student",
                "full_name": "Student One",
                "section": "BSIT 4A",
                "school_year": self.school_year.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="student1")
        self.assertFalse(user.is_active)
        self.assertTrue(StudentProfile.objects.filter(user=user).exists())

    def test_public_registration_rejects_advisers(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "adviser1",
                "email": "adviser1@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
                "role": "adviser",
                "full_name": "Adviser One",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="adviser1").exists())

    def test_admin_create_allows_advisers_only(self):
        admin = User.objects.create_user(
            username="admin",
            password="StrongPass123!",
            role=User.Role.ADMIN,
            is_active=True,
        )
        self.client.force_authenticate(admin)

        adviser_response = self.client.post(
            "/api/users/",
            {
                "username": "faculty1",
                "email": "faculty1@example.com",
                "password": "StrongPass123!",
                "role": "adviser",
                "full_name": "Faculty One",
            },
            format="json",
        )
        student_response = self.client.post(
            "/api/users/",
            {
                "username": "student2",
                "email": "student2@example.com",
                "password": "StrongPass123!",
                "role": "student",
                "full_name": "Student Two",
                "section": "BSIT 4A",
                "school_year": self.school_year.id,
            },
            format="json",
        )

        self.assertEqual(adviser_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AdviserProfile.objects.filter(user__username="faculty1").exists())
        self.assertEqual(student_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="student2").exists())


class StrictSessionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="student",
            password="StrongPass123!",
            role=User.Role.STUDENT,
            is_active=True,
        )

    def login(self, device_id="device-1"):
        return self.client.post(
            "/api/auth/login/",
            {
                "username": "student",
                "password": "StrongPass123!",
                "device_id": device_id,
            },
            format="json",
        )

    def test_login_requires_device_id(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "student", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(LoginSession.objects.exists())

    def test_new_login_replaces_existing_login_for_same_device(self):
        first_login = self.login()
        self.assertEqual(first_login.status_code, status.HTTP_200_OK)
        first_access = first_login.data["access"]

        second_login = self.login()
        self.assertEqual(second_login.status_code, status.HTTP_200_OK)
        second_access = second_login.data["access"]

        self.assertEqual(LoginSession.objects.filter(ended_at__isnull=True).count(), 1)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {first_access}")
        old_session_response = self.client.get("/api/auth/me/")
        self.assertEqual(old_session_response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {second_access}")
        active_session_response = self.client.get("/api/auth/me/")
        self.assertEqual(active_session_response.status_code, status.HTTP_200_OK)

    def test_logout_ends_session_and_blocks_refresh(self):
        login = self.login()
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        logout = self.client.post(
            "/api/auth/logout/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(logout.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(LoginSession.objects.filter(ended_at__isnull=True).exists())

        refresh = self.client.post(
            "/api/auth/refresh/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_server_restart_invalidates_existing_token(self):
        login = self.login()
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        with override_settings(SESSION_SERVER_INSTANCE_ID="after-restart"):
            response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        session = LoginSession.objects.get()
        self.assertEqual(session.end_reason, LoginSession.END_SERVER_RESTART)
