from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Course, Lesson, StudentProgress, ActivityEvent, Recommendation, Enrollment


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'role', 'avatar', 'bio']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid email or password")
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'role', 'avatar', 'bio', 'date_joined']


class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'role', 'avatar', 'bio', 'date_joined', 'last_login']


class EnrollmentSerializer(serializers.ModelSerializer):
    student_email = serializers.EmailField(source='student.email', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'student_email', 'course_title', 'enrolled_at']


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'course', 'title', 'content', 'video_url', 'duration', 'order', 'created_at']


class LessonDetailSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = Lesson
        fields = ['id', 'course', 'course_title', 'title', 'content', 'video_url', 'duration', 'order', 'created_at']


class CourseSerializer(serializers.ModelSerializer):
    mentor_name = serializers.CharField(source='mentor.username', read_only=True)
    total_lessons = serializers.IntegerField(read_only=True)
    total_duration = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'thumbnail', 'mentor', 'mentor_name',
                  'created_at', 'updated_at', 'is_published', 'total_lessons', 'total_duration']


class CourseDetailSerializer(serializers.ModelSerializer):
    mentor_name = serializers.CharField(source='mentor.username', read_only=True)
    lessons = LessonSerializer(many=True, read_only=True)
    total_lessons = serializers.IntegerField(read_only=True)
    total_duration = serializers.IntegerField(read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'thumbnail', 'mentor', 'mentor_name',
                  'created_at', 'updated_at', 'is_published', 'total_lessons',
                  'total_duration', 'lessons', 'student_count']

    def get_student_count(self, obj):
        return obj.students.count()


class StudentProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    course_title = serializers.CharField(source='lesson.course.title', read_only=True)
    course_id = serializers.IntegerField(source='lesson.course_id', read_only=True)

    class Meta:
        model = StudentProgress
        fields = ['id', 'student', 'lesson', 'lesson_title', 'course_title', 'course_id',
                  'completed', 'time_spent', 'completed_at', 'updated_at']


class ActivityEventSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    course_title = serializers.CharField(source='lesson.course.title', read_only=True)

    class Meta:
        model = ActivityEvent
        fields = ['id', 'student', 'lesson', 'lesson_title', 'course_title',
                  'event_type', 'duration', 'created_at']


class RecommendationSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True, default=None)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True, default=None)

    class Meta:
        model = Recommendation
        fields = ['id', 'student', 'course', 'course_title', 'lesson', 'lesson_title',
                  'reason', 'score', 'is_read', 'created_at']
