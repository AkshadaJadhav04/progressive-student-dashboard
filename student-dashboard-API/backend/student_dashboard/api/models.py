from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = 'student', 'Student'
        MENTOR = 'mentor', 'Mentor'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    avatar = models.URLField(max_length=500, blank=True)
    bio = models.TextField(blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role})"


class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    thumbnail = models.URLField(max_length=500, blank=True)
    mentor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mentored_courses')
    students = models.ManyToManyField(User, through='Enrollment', related_name='enrolled_courses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def total_lessons(self):
        return self.lessons.count()

    @property
    def total_duration(self):
        return self.lessons.aggregate(total=models.Sum('duration'))['total'] or 0


class Enrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.email} -> {self.course.title}"


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    content = models.TextField()
    video_url = models.URLField(max_length=500, blank=True)
    duration = models.IntegerField(help_text="Duration in minutes")
    order = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        unique_together = ('course', 'order')

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class StudentProgress(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='progress')
    completed = models.BooleanField(default=False)
    time_spent = models.IntegerField(default=0, help_text="Time spent in minutes")
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'lesson')
        verbose_name_plural = 'Student progress'

    def __str__(self):
        return f"{self.student.email} - {self.lesson.title}: {'✓' if self.completed else '○'}"


class ActivityEvent(models.Model):
    class EventType(models.TextChoices):
        LESSON_START = 'lesson_start', 'Lesson Started'
        LESSON_COMPLETE = 'lesson_complete', 'Lesson Completed'
        LESSON_TIME = 'lesson_time', 'Lesson Time Spent'

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='activities')
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    duration = models.IntegerField(default=0, help_text="Duration in minutes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.email} - {self.event_type} - {self.lesson.title}"


class Recommendation(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recommendations')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, null=True, blank=True, related_name='recommendations')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, null=True, blank=True, related_name='recommendations')
    reason = models.CharField(max_length=300)
    score = models.FloatField(default=0.0, help_text="Recommendation relevance score")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-created_at']

    def __str__(self):
        return f"Rec for {self.student.email}: {self.reason[:50]}"
