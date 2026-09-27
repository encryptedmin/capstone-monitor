from rest_framework import serializers

from .models import Feedback, Submission


class FeedbackSerializer(serializers.ModelSerializer):
    adviser_name = serializers.CharField(source="adviser.username", read_only=True)

    class Meta:
        model = Feedback
        fields = ["id", "submission", "adviser", "adviser_name", "comment", "created_at"]
        read_only_fields = ["adviser"]


class SubmissionSerializer(serializers.ModelSerializer):
    feedback = FeedbackSerializer(many=True, read_only=True)
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
            "status",
            "feedback",
        ]
        read_only_fields = ["submitted_at"]
