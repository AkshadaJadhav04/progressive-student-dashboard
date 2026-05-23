import random
from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from faker import Faker

from api.models import Course, Lesson, StudentProgress, ActivityEvent, Recommendation, Enrollment

User = get_user_model()
fake = Faker()


class Command(BaseCommand):
    help = 'Seed the database with sample data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        self._create_users()
        self._create_courses()
        self._create_lessons()
        self._create_enrollments()
        self._create_progress()
        self._create_activities()
        self._create_recommendations()

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))

    def _create_users(self):
        if User.objects.count() > 2:
            self.stdout.write('Users already exist, skipping...')
            return

        self.mentors = []
        self.students = []

        mentor_data = [
            {'email': 'mentor1@example.com', 'username': 'Dr. Smith', 'role': 'mentor'},
            {'email': 'mentor2@example.com', 'username': 'Prof. Johnson', 'role': 'mentor'},
            {'email': 'mentor3@example.com', 'username': 'Ms. Williams', 'role': 'mentor'},
        ]
        for data in mentor_data:
            user, _ = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'username': data['username'],
                    'role': data['role'],
                    'bio': fake.text(max_nb_chars=200),
                }
            )
            user.set_password('password123')
            user.save()
            self.mentors.append(user)

        student_emails = [f'student{i}@example.com' for i in range(1, 16)]
        for email in student_emails:
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': fake.name(),
                    'role': 'student',
                    'bio': fake.text(max_nb_chars=200),
                }
            )
            user.set_password('password123')
            user.save()
            self.students.append(user)

        self.stdout.write(f'Created {len(self.mentors)} mentors and {len(self.students)} students')

    def _create_courses(self):
        if Course.objects.count() > 0:
            self.stdout.write('Courses already exist, skipping...')
            self.courses = Course.objects.all()
            return

        course_data = [
            {'title': 'Python Fundamentals', 'desc': 'Learn Python programming from scratch covering variables, loops, functions, and OOP.'},
            {'title': 'Data Science Essentials', 'desc': 'Master data analysis with pandas, numpy, and visualization libraries.'},
            {'title': 'Web Development with React', 'desc': 'Build modern web applications using React.js and related technologies.'},
            {'title': 'Machine Learning Basics', 'desc': 'Introduction to ML algorithms, scikit-learn, and model evaluation.'},
            {'title': 'Database Design & SQL', 'desc': 'Learn relational database design, SQL queries, and normalization.'},
            {'title': 'Docker & DevOps', 'desc': 'Containerization, CI/CD pipelines, and modern deployment practices.'},
            {'title': 'JavaScript Deep Dive', 'desc': 'Advanced JavaScript concepts including closures, promises, and async/await.'},
            {'title': 'Cybersecurity Fundamentals', 'desc': 'Learn network security, cryptography, and secure coding practices.'},
            {'title': 'Cloud Computing with AWS', 'desc': 'AWS services, EC2, S3, Lambda, and cloud architecture patterns.'},
            {'title': 'Mobile App Development', 'desc': 'Build cross-platform mobile apps with React Native.'},
        ]

        self.courses = []
        for i, data in enumerate(course_data):
            mentor = random.choice(self.mentors)
            course = Course.objects.create(
                title=data['title'],
                description=data['desc'],
                mentor=mentor,
                thumbnail=f'https://picsum.photos/seed/{i+1}/400/300',
                is_published=True,
            )
            self.courses.append(course)

        self.stdout.write(f'Created {len(self.courses)} courses')

    def _create_lessons(self):
        if Lesson.objects.count() > 0:
            self.stdout.write('Lessons already exist, skipping...')
            return

        lesson_templates = [
            ['Introduction & Setup', 'Core Concepts', 'Intermediate Topics', 'Advanced Techniques', 'Final Project'],
            ['Getting Started', 'Data Types & Structures', 'Working with APIs', 'Best Practices', 'Review & Testing'],
            ['Environment Setup', 'Building Components', 'State Management', 'Routing & Navigation', 'Deployment'],
            ['What is ML?', 'Supervised Learning', 'Unsupervised Learning', 'Model Evaluation', 'Capstone Project'],
            ['DB Concepts', 'Basic Queries', 'Joins & Subqueries', 'Normalization', 'Performance Tuning'],
            ['Docker Basics', 'Docker Compose', 'CI/CD Pipeline', 'Kubernetes Intro', 'Production Deployment'],
            ['JS Fundamentals', 'Functions & Scope', 'Asynchronous JS', 'Error Handling', 'Modern JS Features'],
            ['Security Overview', 'Network Security', 'Web Security', 'Cryptography', 'Security Best Practices'],
            ['AWS Overview', 'EC2 & Compute', 'S3 & Storage', 'Lambda & Serverless', 'Architecture Design'],
            ['React Native Intro', 'Building UI', 'Navigation', 'Native Features', 'App Store Deployment'],
        ]

        self.lessons = []
        for course_idx, course in enumerate(self.courses):
            templates = lesson_templates[course_idx % len(lesson_templates)]
            for order, title in enumerate(templates, 1):
                lesson = Lesson.objects.create(
                    course=course,
                    title=title,
                    content=fake.text(max_nb_chars=1000),
                    video_url=f'https://example.com/videos/{course.id}-{order}',
                    duration=random.randint(15, 60),
                    order=order,
                )
                self.lessons.append(lesson)

        self.stdout.write(f'Created {len(self.lessons)} lessons')

    def _create_enrollments(self):
        if Enrollment.objects.count() > 0:
            return

        count = 0
        for student in self.students:
            enrolled_courses = random.sample(self.courses, random.randint(3, 7))
            for course in enrolled_courses:
                Enrollment.objects.get_or_create(student=student, course=course)
                count += 1

        self.stdout.write(f'Created {count} enrollments')

    def _create_progress(self):
        if StudentProgress.objects.count() > 0:
            return

        count = 0
        for student in self.students:
            enrollments = Enrollment.objects.filter(student=student)
            for enrollment in enrollments:
                lessons = enrollment.course.lessons.all()
                completed_count = random.randint(0, lessons.count())
                for lesson in lessons[:completed_count]:
                    StudentProgress.objects.get_or_create(
                        student=student,
                        lesson=lesson,
                        defaults={
                            'completed': True,
                            'time_spent': random.randint(10, lesson.duration),
                            'completed_at': timezone.now() - timedelta(days=random.randint(0, 30)),
                        }
                    )
                    count += 1

        self.stdout.write(f'Created {count} progress records')

    def _create_activities(self):
        if ActivityEvent.objects.count() > 0:
            return

        count = 0
        for student in self.students:
            progress_records = StudentProgress.objects.filter(student=student, completed=True)
            for progress in progress_records:
                days_ago = random.randint(0, 30)
                for event_type in ['lesson_start', 'lesson_complete', 'lesson_time']:
                    ActivityEvent.objects.create(
                        student=student,
                        lesson=progress.lesson,
                        event_type=event_type,
                        duration=random.randint(5, progress.lesson.duration),
                        created_at=timezone.now() - timedelta(days=days_ago, hours=random.randint(0, 23)),
                    )
                    count += 1

        self.stdout.write(f'Created {count} activity events')

    def _create_recommendations(self):
        if Recommendation.objects.count() > 0:
            return

        from api.recommendations import RecommendationEngine
        count = 0
        for student in self.students:
            engine = RecommendationEngine(student)
            recs = engine.generate_recommendations()
            count += len(recs)

        self.stdout.write(f'Created {count} recommendations')
