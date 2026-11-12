from rest_framework import serializers
from rest_framework.reverse import reverse

from config.file_responses import display_file_name

from .models import Announcement, DocumentTemplate, Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "message", "is_read", "created_at"]


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source="posted_by.email", read_only=True, default=None)

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
    file = serializers.FileField(use_url=False)
    file_name = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source="uploaded_by.email", read_only=True, default=None)

    class Meta:
        model = DocumentTemplate
        fields = [
            "id",
            "title",
            "description",
            "file",
            "file_name",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = ["uploaded_by", "created_at"]

    def get_file_name(self, obj):
        return display_file_name(obj.file.name)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.file:
            data["file"] = reverse(
                "document-template-file",
                kwargs={"pk": instance.pk},
                request=self.context.get("request"),
            )
        return data
