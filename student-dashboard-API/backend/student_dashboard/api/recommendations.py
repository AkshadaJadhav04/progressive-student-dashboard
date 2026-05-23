from django.db.models import Count, Q, Exists, OuterRef
from .models import User, Course, Lesson, StudentProgress, ActivityEvent, Recommendation


class RecommendationEngine:
    def __init__(self, student):
        self.student = student

    def generate_recommendations(self):
        Recommendation.objects.filter(student=self.student).delete()
        recs = []

        recs.extend(self._recommend_next_lessons())
        recs.extend(self._recommend_weak_topics())
        recs.extend(self._recommend_courses())

        for rec in recs:
            Recommendation.objects.create(**rec)

        return recs

    def _recommend_next_lessons(self):
        completed_lesson_ids = StudentProgress.objects.filter(
            student=self.student, completed=True
        ).values_list('lesson_id', flat=True)

        next_lessons = Lesson.objects.filter(
            course__students=self.student
        ).exclude(
            id__in=completed_lesson_ids
        ).order_by('course_id', 'order')

        recs = []
        for lesson in next_lessons:
            recs.append({
                'student': self.student,
                'course': lesson.course,
                'lesson': lesson,
                'reason': f"Continue with next lesson: {lesson.title} in {lesson.course.title}",
                'score': 0.9,
            })
        return recs[:5]

    def _recommend_weak_topics(self):
        course_progress = []
        courses = Course.objects.filter(students=self.student)

        for course in courses:
            total = course.lessons.count()
            completed = StudentProgress.objects.filter(
                student=self.student,
                lesson__course=course,
                completed=True
            ).count()
            if total > 0:
                pct = completed / total
                course_progress.append((course, pct, total - completed))

        weak_courses = sorted(course_progress, key=lambda x: x[1])[:3]

        recs = []
        for course, pct, remaining in weak_courses:
            if remaining > 0 and pct < 0.8:
                incomplete = Lesson.objects.filter(
                    course=course
                ).exclude(
                    id__in=StudentProgress.objects.filter(
                        student=self.student, completed=True
                    ).values('lesson_id')
                ).first()
                if incomplete:
                    recs.append({
                        'student': self.student,
                        'course': course,
                        'lesson': incomplete,
                        'reason': f"You've only completed {int(pct*100)}% of {course.title}. Focus on completing this course.",
                        'score': 0.7 + (1 - pct) * 0.2,
                    })
        return recs

    def _recommend_courses(self):
        enrolled_course_ids = Course.objects.filter(
            students=self.student
        ).values_list('id', flat=True)

        popular_courses = Course.objects.filter(is_published=True).exclude(
            id__in=enrolled_course_ids
        ).annotate(
            student_count=Count('students'),
            activity_count=Count('lessons__activities')
        ).order_by('-student_count', '-activity_count')[:3]

        recent_activity_courses = Course.objects.filter(
            lessons__activities__student=self.student
        ).exclude(
            id__in=enrolled_course_ids
        ).distinct()[:3]

        seen_courses = set()
        recs = []

        for course in list(popular_courses) + list(recent_activity_courses):
            if course.id not in seen_courses:
                seen_courses.add(course.id)
                recs.append({
                    'student': self.student,
                    'course': course,
                    'lesson': None,
                    'reason': f"Recommended course: {course.title} - {course.description[:100]}",
                    'score': 0.6,
                })
        return recs[:5]
