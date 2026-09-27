from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AdviserProfile, StudentProfile, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "role", "is_active", "created_at"]
    fieldsets = UserAdmin.fieldsets + (("Role", {"fields": ("role",)}),)


admin.site.register(StudentProfile)
admin.site.register(AdviserProfile)
