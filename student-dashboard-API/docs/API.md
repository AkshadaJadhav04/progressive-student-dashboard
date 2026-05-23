# Progressive Student Dashboard API

Base URL: `http://localhost:8000/api/`

## Authentication

All endpoints except register/login require JWT token in header:
```
Authorization: Bearer <access_token>
```

### Register
```
POST /auth/register/
Body: {
  "email": "user@example.com",
  "username": "John Doe",
  "password": "securepass123",
  "role": "student"        // "student" or "mentor"
}
Response 201: {
  "user": { "id": 1, "email": "...", "username": "...", "role": "..." },
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>"
}
```

### Login
```
POST /auth/login/
Body: { "email": "user@example.com", "password": "securepass123" }
Response 200: { "user": {...}, "access": "...", "refresh": "..." }
```

### Logout
```
POST /auth/logout/
Body: { "refresh": "<refresh_token>" }
Response 200: { "detail": "Logged out successfully" }
```

### Get Current User
```
GET /auth/me/
Response 200: { "id": 1, "email": "...", "username": "...", "role": "...", ... }
```

### Refresh Token
```
POST /auth/refresh/   (built-in simplejwt endpoint)
Body: { "refresh": "<refresh_token>" }
Response: { "access": "...", "refresh": "..." }
```

## Courses

### List All Courses
```
GET /courses/
Query: ?search=python&is_published=true&ordering=-created_at
Response: { "count": 10, "results": [...], ... }
```

### Course Detail (with lessons)
```
GET /courses/{id}/
Response: { "id": 1, "title": "...", "lessons": [...], ... }
```

### Enroll in Course (Student only)
```
POST /courses/{id}/enroll/
Response 201: { "id": 1, "student": 1, "course": 1, "enrolled_at": "..." }
```

## Lessons

### List Lessons
```
GET /lessons/?course=1
```

### Lesson Detail
```
GET /lessons/{id}/
```

## Progress

### List Progress (Student sees own; Mentor sees all)
```
GET /progress/?completed=true&lesson__course=1
```

### Create/Update Progress
```
POST /progress/
Body: { "lesson": 1, "completed": true, "time_spent": 30 }
```

## Activity Tracking

### Track Activity Event
```
POST /track-activity/
Body: { 
  "lesson_id": 1,
  "event_type": "lesson_complete",  // lesson_start, lesson_complete, lesson_time
  "duration": 25
}
```

## Student Dashboard

### Dashboard Stats
```
GET /dashboard/student/
Response: {
  "total_completed_lessons": 15,
  "total_learning_time": 450,
  "overall_progress": 45.5,
  "learning_streak": 5,
  "course_progress": [{ "course_title": "...", "percentage": 60, ... }],
  "recent_lessons": [...]
}
```

### Analytics
```
GET /analytics/student/?period=weekly    (or monthly)
Response: {
  "activity_trend": [{ "date": "2024-01-01", "count": 3 }, ...],
  "completed_vs_pending": { "completed": 15, "pending": 18 },
  "course_progress": [{ "course_title": "...", "percentage": 60 }, ...]
}
```

### Recommendations
```
GET /recommendations/
Response: [{ "id": 1, "course_title": "...", "lesson_title": "...", "reason": "...", "score": 0.9 }, ...]

POST /recommendations/   (Regenerate)
Response: Same as GET
```

## Mentor Dashboard

### Dashboard Stats
```
GET /dashboard/mentor/
Response: {
  "total_students": 15,
  "weak_students_count": 2,
  "students": [{ "student_name": "...", "overall_progress": 45, ... }],
  "weak_students": [{ "student_name": "...", "overall_progress": 20, ... }],
  "course_engagement": [{ "course_title": "...", "engagement_rate": 55.5, ... }]
}
```

### Mentor Students List
```
GET /mentor/students/
GET /mentor/students/{student_id}/
```

## CSV Export

### Student Export (Student only)
```
GET /export/student/csv/
Response: CSV file download
```

### Mentor Export (Mentor only)
```
GET /export/mentor/csv/
Response: CSV file download
```

## API Documentation

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **Schema**: http://localhost:8000/api/schema/
