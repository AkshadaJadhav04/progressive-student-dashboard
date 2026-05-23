import csv
from django.http import HttpResponse
from django.db.models import Count, Sum, Q
from django.utils import timezone
from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

from .models import User, Course, Lesson, StudentProgress, ActivityEvent, Recommendation, Enrollment
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer, UserDetailSerializer,
    CourseSerializer, CourseDetailSerializer, LessonSerializer, LessonDetailSerializer,
    StudentProgressSerializer, ActivityEventSerializer, RecommendationSerializer,
    EnrollmentSerializer
)
from .permissions import IsStudent, IsMentor, IsOwnerOrReadOnly
from .analytics import StudentAnalytics, MentorAnalytics
from .recommendations import RecommendationEngine


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'detail': 'Logged out successfully'})
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    serializer = UserDetailSerializer(request.user)
    return Response(serializer.data)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    filterset_fields = ['is_published', 'mentor']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

    def get_queryset(self):
        qs = Course.objects.all()
        if self.request.user.role == 'student':
            qs = qs.filter(is_published=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(mentor=self.request.user)

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        course = self.get_object()
        if request.user.role != 'student':
            return Response({'error': 'Only students can enroll'}, status=status.HTTP_403_FORBIDDEN)
        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user, course=course
        )
        if not created:
            return Response({'detail': 'Already enrolled'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = EnrollmentSerializer(enrollment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    filterset_fields = ['course']
    search_fields = ['title', 'content']
    ordering_fields = ['order', 'created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LessonDetailSerializer
        return LessonSerializer


class ProgressViewSet(viewsets.ModelViewSet):
    serializer_class = StudentProgressSerializer
    filterset_fields = ['completed', 'lesson__course']
    search_fields = ['lesson__title']

    def get_queryset(self):
        if self.request.user.role == 'student':
            return StudentProgress.objects.filter(student=self.request.user)
        return StudentProgress.objects.all()

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_activity(request):
    student = request.user
    lesson_id = request.data.get('lesson_id')
    event_type = request.data.get('event_type')
    duration = request.data.get('duration', 0)

    if not all([lesson_id, event_type]):
        return Response({'error': 'lesson_id and event_type are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lesson = Lesson.objects.get(id=lesson_id)
    except Lesson.DoesNotExist:
        return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)

    event = ActivityEvent.objects.create(
        student=student,
        lesson=lesson,
        event_type=event_type,
        duration=duration
    )

    if event_type == 'lesson_complete':
        progress, created = StudentProgress.objects.get_or_create(
            student=student,
            lesson=lesson,
            defaults={'completed': True, 'time_spent': duration, 'completed_at': timezone.now()}
        )
        if not progress.completed:
            progress.completed = True
            progress.completed_at = timezone.now()
            progress.save()

    serializer = ActivityEventSerializer(event)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


class StudentDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        analytics = StudentAnalytics(request.user)
        progress = analytics.course_progress()
        recent = analytics.recent_lessons()

        return Response({
            'total_completed_lessons': analytics.total_completed_lessons(),
            'total_learning_time': analytics.total_learning_time(),
            'overall_progress': analytics.overall_progress_percentage(),
            'learning_streak': analytics.learning_streak(),
            'course_progress': progress,
            'recent_lessons': ActivityEventSerializer(recent, many=True).data,
        })


class StudentAnalyticsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        analytics = StudentAnalytics(request.user)
        period = request.query_params.get('period', 'weekly')

        if period == 'monthly':
            activity = analytics.monthly_activity()
        else:
            activity = analytics.weekly_activity()

        progress = analytics.course_progress()
        completed = analytics.total_completed_lessons()
        total = StudentProgress.objects.filter(student=request.user).count()
        pending = total - completed

        return Response({
            'activity_trend': activity,
            'completed_vs_pending': {
                'completed': completed,
                'pending': max(0, pending),
            },
            'course_progress': progress,
        })


class MentorDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsMentor]

    def get(self, request):
        analytics = MentorAnalytics(request.user)
        students = analytics.student_performance()
        weak = analytics.weak_students()
        engagement = analytics.course_engagement()

        return Response({
            'total_students': len(students),
            'weak_students_count': len(weak),
            'students': students,
            'weak_students': weak,
            'course_engagement': engagement,
        })


class MentorStudentsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsMentor]

    def get(self, request, student_id=None):
        analytics = MentorAnalytics(request.user)
        if student_id:
            data = analytics.student_performance(student_id=student_id)
            if data:
                student = data[0]
                sa = StudentAnalytics(User.objects.get(id=student_id))
                student['activity'] = sa.weekly_activity()
                student['course_progress'] = sa.course_progress()
                return Response(student)
            return Response({'error': 'Student not found'}, status=404)
        return Response(analytics.student_performance())


class RecommendationView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        recs = Recommendation.objects.filter(student=request.user)[:10]
        serializer = RecommendationSerializer(recs, many=True)
        return Response(serializer.data)

    def post(self, request):
        engine = RecommendationEngine(request.user)
        recs = engine.generate_recommendations()
        serializer = RecommendationSerializer(recs, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_student_csv(request):
    if request.user.role != 'student':
        return Response({'error': 'Only students can export their data'}, status=403)

    analytics = StudentAnalytics(request.user)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="student_progress.csv"'
    writer = csv.writer(response)
    writer.writerow(['Course', 'Lesson', 'Completed', 'Time Spent (min)', 'Completed At'])

    progress = StudentProgress.objects.filter(student=request.user).select_related('lesson__course')
    for p in progress:
        writer.writerow([
            p.lesson.course.title,
            p.lesson.title,
            'Yes' if p.completed else 'No',
            p.time_spent,
            p.completed_at,
        ])
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsMentor])
def export_mentor_csv(request):
    analytics = MentorAnalytics(request.user)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="mentor_report.csv"'
    writer = csv.writer(response)

    students = analytics.student_performance()
    writer.writerow(['Student Name', 'Email', 'Completed Lessons', 'Total Time (min)', 'Progress %', 'Streak'])
    for s in students:
        writer.writerow([
            s['student_name'], s['student_email'], s['total_completed'],
            s['total_time'], s['overall_progress'], s['streak'],
        ])
    return response
