from rest_framework import serializers
from rest_framework.reverse import reverse

from config.file_responses import display_file_name
from .models import Feedback, Submission, SubmissionHistory


class FeedbackSerializer(serializers.ModelSerializer):
    adviser_name = serializers.CharField(source="adviser.adviser_profile.full_name", read_only=True, default=None)

    class Meta:
        model = Feedback
        fields = ["id", "submission", "adviser", "adviser_name", "comment", "created_at"]
        read_only_fields = ["adviser"]


class SubmissionHistorySerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=False)
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = SubmissionHistory
        fields = ["id", "file", "file_name", "status", "replaced_at"]

    def get_file_url(self, obj):
        return reverse(
            "submission-history-file",
            kwargs={"pk": obj.submission_id, "history_id": obj.pk},
            request=self.context.get("request"),
        )

    def get_file_name(self, obj):
        return display_file_name(obj.file.name)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["file"] = self.get_file_url(instance)
        return data


class SubmissionSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=False)
    file_name = serializers.SerializerMethodField()
    feedback = FeedbackSerializer(many=True, read_only=True)
    history = SubmissionHistorySerializer(many=True, read_only=True)
    milestone_title = serializers.CharField(source="milestone.title", read_only=True)
    group_title = serializers.CharField(source="group.capstone_title", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "group",
            "group_title",
            "milestone",
            "milestone_title",
            "file",
            "file_name",
            "submitted_at",
            "updated_at",
            "status",
            "resubmission_count",
            "feedback",
            "history",
        ]
        read_only_fields = ["submitted_at", "updated_at", "resubmission_count"]

    def get_file_url(self, obj):
        return reverse(
            "submission-file",
            kwargs={"pk": obj.pk},
            request=self.context.get("request"),
        )

    def get_file_name(self, obj):
        return display_file_name(obj.file.name)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["file"] = self.get_file_url(instance)
        return data


class SubmissionResubmitSerializer(serializers.Serializer):
    """Used only by SubmissionViewSet.resubmit -- a student replacing the
    file on their own rejected/revision-needed submission."""

    file = serializers.FileField()
