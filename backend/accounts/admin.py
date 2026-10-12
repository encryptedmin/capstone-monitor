from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AdviserProfile, LoginSession, SchoolYear, StudentProfile, SystemSetting, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["email", "role", "is_active", "approved_at", "created_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["email"]
    ordering = ["email"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        ("Role", {"fields": ("role", "approved_at")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "role", "password1", "password2")}),
    )


@admin.register(SchoolYear)
class SchoolYearAdmin(admin.ModelAdmin):
    list_display = ["label", "is_active", "start_year", "start_semester", "end_year", "end_semester"]
    list_filter = ["is_active"]


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ["default_adviser_capacity", "display_school_year", "updated_at"]

    def has_add_permission(self, request):
        return not SystemSetting.objects.exists()


admin.site.register(StudentProfile)
admin.site.register(AdviserProfile)


@admin.register(LoginSession)
class LoginSessionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "device_id",
        "server_instance_id",
        "created_at",
        "last_seen_at",
        "ended_at",
        "end_reason",
    ]
    list_filter = ["end_reason", "ended_at"]
    search_fields = ["user__email", "device_id", "server_instance_id"]
    readonly_fields = [
        "id",
        "user",
        "device_id",
        "server_instance_id",
        "user_agent",
        "created_at",
        "last_seen_at",
        "ended_at",
        "end_reason",
    ]
