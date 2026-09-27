from django.urls import path

from .views import DepartmentAnalyticsView, DepartmentPdfReportView

urlpatterns = [
    path("analytics/", DepartmentAnalyticsView.as_view(), name="report-analytics"),
    path("pdf/", DepartmentPdfReportView.as_view(), name="report-pdf"),
]
