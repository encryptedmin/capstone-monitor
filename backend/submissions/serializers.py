from rest_framework import serializers

from .models import Feedback, Submission, SubmissionHistory


class FeedbackSerializer(serializers.ModelSerializer):
    adviser_name = serializers.CharField(source="adviser.username", read_only=True)

    class Meta:
        model = Feedback
        fields = ["id", "submission", "adviser", "adviser_name", "comment", "created_at"]
        read_only_fields = ["adviser"]


class SubmissionHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionHistory
        fields = ["id", "file", "status", "replaced_at"]


class SubmissionSerializer(serializers.ModelSerializer):
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
            "submitted_at",
            "updated_at",
            "status",
            "resubmission_count",
            "feedback",
            "history",
        ]
        read_only_fields = ["submitted_at", "updated_at", "resubmission_count"]


class SubmissionResubmitSerializer(serializers.Serializer):
    """Used only by SubmissionViewSet.resubmit -- a student replacing the
    file on their own rejected/revision-needed submission."""

    file = serializers.FileField()
