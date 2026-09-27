from django.contrib import admin

from .models import CapstoneGroup, GroupMember


class GroupMemberInline(admin.TabularInline):
    model = GroupMember
    extra = 1


@admin.register(CapstoneGroup)
class CapstoneGroupAdmin(admin.ModelAdmin):
    list_display = ["capstone_title", "adviser", "created_at"]
    inlines = [GroupMemberInline]
