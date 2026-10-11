from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdmin

from .models import Announcement, DocumentTemplate, Notification
from .serializers import AnnouncementSerializer, DocumentTemplateSerializer, NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Every user only ever sees their own notifications ('Receive
    Notifications' use case). Frontend can poll this endpoint, filtering
    ?is_read=false for the unread badge count.
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == "true")
        return qs

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"status": "all marked read"})


class AnnouncementViewSet(viewsets.ModelViewSet):
    """Admin posts/edits/deletes department announcements; everyone
    authenticated can read them ('Post Announcements' use case)."""

    serializer_class = AnnouncementSerializer
    queryset = Announcement.objects.all()

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(posted_by=self.request.user)


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    """Admin uploads/manages documentation templates; everyone
    authenticated can list/download them."""

    serializer_class = DocumentTemplateSerializer
    queryset = DocumentTemplate.objects.all()

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
