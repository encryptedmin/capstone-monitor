from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AdviserDirectoryView, CapstoneGroupViewSet, GroupMemberViewSet

router = DefaultRouter()
router.register("groups", CapstoneGroupViewSet, basename="capstonegroup")
router.register("group-members", GroupMemberViewSet, basename="groupmember")

urlpatterns = [
    path("advisers/directory/", AdviserDirectoryView.as_view(), name="adviser-directory"),
] + router.urls
