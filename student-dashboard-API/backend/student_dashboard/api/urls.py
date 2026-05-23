from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'courses', views.CourseViewSet)
router.register(r'lessons', views.LessonViewSet)
router.register(r'progress', views.ProgressViewSet, basename='progress')

urlpatterns = [
    path('auth/register/', views.register, name='auth-register'),
    path('auth/login/', views.login, name='auth-login'),
    path('auth/logout/', views.logout, name='auth-logout'),
    path('auth/me/', views.me, name='auth-me'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),

    path('track-activity/', views.track_activity, name='track-activity'),

    path('dashboard/student/', views.StudentDashboardView.as_view(), name='student-dashboard'),
    path('analytics/student/', views.StudentAnalyticsView.as_view(), name='student-analytics'),

    path('dashboard/mentor/', views.MentorDashboardView.as_view(), name='mentor-dashboard'),
    path('mentor/students/', views.MentorStudentsView.as_view(), name='mentor-students'),
    path('mentor/students/<int:student_id>/', views.MentorStudentsView.as_view(), name='mentor-student-detail'),

    path('recommendations/', views.RecommendationView.as_view(), name='recommendations'),

    path('export/student/csv/', views.export_student_csv, name='export-student-csv'),
    path('export/mentor/csv/', views.export_mentor_csv, name='export-mentor-csv'),

    path('', include(router.urls)),
]
