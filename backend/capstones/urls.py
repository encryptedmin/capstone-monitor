from rest_framework.routers import DefaultRouter

from .views import CapstoneGroupViewSet, GroupMemberViewSet

router = DefaultRouter()
router.register("groups", CapstoneGroupViewSet, basename="capstonegroup")
router.register("group-members", GroupMemberViewSet, basename="groupmember")

urlpatterns = router.urls
