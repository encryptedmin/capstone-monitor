from rest_framework import serializers

from .models import Announcement, DocumentTemplate, Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "message", "is_read", "created_at"]


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source="posted_by.username", read_only=True, default=None)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "body",
            "is_pinned",
            "posted_by",
            "posted_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["posted_by", "created_at", "updated_at"]


class DocumentTemplateSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.username", read_only=True, default=None)

    class Meta:
        model = DocumentTemplate
        fields = [
            "id",
            "title",
            "description",
            "file",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = ["uploaded_by", "created_at"]
