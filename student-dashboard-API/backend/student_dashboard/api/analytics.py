from django.db.models import Count, Sum, Q, Avg, F
from django.utils import timezone
from datetime import timedelta, datetime
from .models import User, Course, Lesson, StudentProgress, ActivityEvent


class StudentAnalytics:
    def __init__(self, student):
        self.student = student

    def total_completed_lessons(self):
        return StudentProgress.objects.filter(student=self.student, completed=True).count()

    def total_learning_time(self):
        result = ActivityEvent.objects.filter(
            student=self.student,
            event_type='lesson_time'
        ).aggregate(total=Sum('duration'))
        return result['total'] or 0

    def course_progress(self, course_id=None):
        progress_data = []
        courses = Course.objects.filter(students=self.student)
        if course_id:
            courses = courses.filter(id=course_id)

        for course in courses:
            total = course.lessons.count()
            completed = StudentProgress.objects.filter(
                student=self.student,
                lesson__course=course,
                completed=True
            ).count()
            progress_data.append({
                'course_id': course.id,
                'course_title': course.title,
                'total_lessons': total,
                'completed_lessons': completed,
                'percentage': round((completed / total * 100) if total > 0 else 0, 1),
            })
        return progress_data

    def overall_progress_percentage(self):
        total_lessons = StudentProgress.objects.filter(student=self.student).count()
        completed = StudentProgress.objects.filter(student=self.student, completed=True).count()
        return round((completed / total_lessons * 100) if total_lessons > 0 else 0, 1)

    def learning_streak(self):
        today = timezone.now().date()
        streak = 0
        check_date = today

        while True:
            has_activity = ActivityEvent.objects.filter(
                student=self.student,
                created_at__date=check_date
            ).exists()
            if has_activity:
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        return streak

    def recent_lessons(self, limit=5):
        return ActivityEvent.objects.filter(
            student=self.student,
            event_type='lesson_complete'
        ).select_related('lesson', 'lesson__course').order_by('-created_at')[:limit]

    def weekly_activity(self, weeks=4):
        end_date = timezone.now().date()
        start_date = end_date - timedelta(weeks=weeks)
        days = []
        current = start_date
        while current <= end_date:
            count = ActivityEvent.objects.filter(
                student=self.student,
                created_at__date=current
            ).count()
            days.append({'date': current.isoformat(), 'count': count})
            current += timedelta(days=1)
        return days

    def monthly_activity(self, months=6):
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=months * 30)
        months_data = []
        current = start_date.replace(day=1)
        while current <= end_date:
            next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
            count = ActivityEvent.objects.filter(
                student=self.student,
                created_at__date__gte=current,
                created_at__date__lt=next_month
            ).count()
            months_data.append({
                'month': current.strftime('%Y-%m'),
                'count': count
            })
            current = next_month
        return months_data


class MentorAnalytics:
    def __init__(self, mentor):
        self.mentor = mentor

    def all_students(self):
        return User.objects.filter(
            enrolled_courses__mentor=self.mentor
        ).distinct()

    def student_performance(self, student_id=None):
        students = self.all_students()
        if student_id:
            students = students.filter(id=student_id)

        data = []
        for s in students:
            analytics = StudentAnalytics(s)
            data.append({
                'student_id': s.id,
                'student_name': s.username,
                'student_email': s.email,
                'total_completed': analytics.total_completed_lessons(),
                'total_time': analytics.total_learning_time(),
                'overall_progress': analytics.overall_progress_percentage(),
                'streak': analytics.learning_streak(),
            })
        return sorted(data, key=lambda x: x['overall_progress'])

    def weak_students(self, threshold=30.0):
        return [s for s in self.student_performance() if s['overall_progress'] < threshold]

    def course_engagement(self):
        courses = Course.objects.filter(mentor=self.mentor)
        data = []
        for course in courses:
            enrolled = course.students.count()
            total_lessons = course.total_lessons
            completions = StudentProgress.objects.filter(
                lesson__course=course,
                completed=True
            ).count()
            total_possible = enrolled * total_lessons if enrolled > 0 else 1
            data.append({
                'course_id': course.id,
                'course_title': course.title,
                'enrolled_students': enrolled,
                'total_lessons': total_lessons,
                'total_completions': completions,
                'engagement_rate': round((completions / total_possible * 100), 1) if total_possible > 0 else 0,
            })
        return data
