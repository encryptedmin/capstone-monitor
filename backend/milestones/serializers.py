from rest_framework import serializers

from .models import Milestone


class MilestoneSerializer(serializers.ModelSerializer):
    group_title = serializers.CharField(source="group.capstone_title", read_only=True)

    class Meta:
        model = Milestone
        fields = ["id", "group", "group_title", "title", "description", "deadline", "status"]
