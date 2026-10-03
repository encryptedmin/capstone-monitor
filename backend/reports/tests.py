from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User


class DepartmentPdfReportTests(APITestCase):
    def test_report_is_served_inline(self):
        user = User.objects.create_user(
            username="report-admin", password="test-password", role=User.Role.ADMIN
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
