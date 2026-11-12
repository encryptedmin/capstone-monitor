from django.contrib import admin
from django.urls import include, path, re_path

from .views import frontend_app

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("capstones.urls")),
    path("api/", include("milestones.urls")),
    path("api/", include("submissions.urls")),
    path("api/", include("notifications.urls")),
    path("api/reports/", include("reports.urls")),
    path("", frontend_app, name="frontend"),
    re_path(
        r"^(?!api(?:/|$)|django-admin(?:/|$)|static(?:/|$)|media(?:/|$)).*$",
        frontend_app,
        name="frontend-route",
    ),
]
