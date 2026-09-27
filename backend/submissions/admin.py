from django.contrib import admin

from .models import Feedback, Submission

admin.site.register(Submission)
admin.site.register(Feedback)
