from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    SchoolYearViewSet,
    StrictTokenRefreshView,
    SystemSettingView,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("school-years", SchoolYearViewSet, basename="school-year")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/refresh/", StrictTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("settings/", SystemSettingView.as_view(), name="system-settings"),
] + router.urls
