from rest_framework.routers import DefaultRouter

from .views import AnnouncementViewSet, DocumentTemplateViewSet, NotificationViewSet

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")
router.register("announcements", AnnouncementViewSet, basename="announcement")
router.register("document-templates", DocumentTemplateViewSet, basename="document-template")

urlpatterns = router.urls
