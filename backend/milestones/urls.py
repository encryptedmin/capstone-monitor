from rest_framework.routers import DefaultRouter

from .views import MilestoneViewSet

router = DefaultRouter()
router.register("milestones", MilestoneViewSet, basename="milestone")

urlpatterns = router.urls
