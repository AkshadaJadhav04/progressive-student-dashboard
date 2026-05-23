from django.contrib import admin
from .models import User, Course, Lesson, StudentProgress, ActivityEvent, Recommendation, Enrollment

admin.site.register(User)
admin.site.register(Course)
admin.site.register(Lesson)
admin.site.register(StudentProgress)
admin.site.register(ActivityEvent)
admin.site.register(Recommendation)
admin.site.register(Enrollment)
