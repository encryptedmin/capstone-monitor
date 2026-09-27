from rest_framework.routers import DefaultRouter

from .views import FeedbackViewSet, SubmissionViewSet

router = DefaultRouter()
router.register("submissions", SubmissionViewSet, basename="submission")
router.register("feedback", FeedbackViewSet, basename="feedback")

urlpatterns = router.urls
