# Progressive Student Dashboard

A full-stack learning management system with analytics, recommendations, and role-based dashboards for students and mentors.

## Tech Stack

- **Backend**: Django 5.0 + Django REST Framework + JWT Auth
- **Frontend**: Vanilla HTML5/CSS3/JS with Chart.js
- **Database**: MySQL
- **Design**: Dark purple/blue theme with glassmorphism

## Project Structure

```
student-dashboard-API/
├── backend/
│   └── student_dashboard/
│       ├── api/
│       │   ├── models.py          # 7 database models
│       │   ├── views.py           # REST API views
│       │   ├── serializers.py     # DRF serializers
│       │   ├── urls.py            # API routes
│       │   ├── analytics.py       # Analytics engine
│       │   ├── recommendations.py # Recommendation engine
│       │   ├── permissions.py     # Role-based permissions
│       │   └── management/commands/
│       │       └── seed_data.py   # Sample data seeder
│       ├── student_dashboard/     # Django project settings
│       └── manage.py
├── docs/
├── screenshots/
├── requirements.txt
├── .env.example
└── student_dashboard.sql          # Standalone MySQL schema

student-dashboard-UI/
└── frontend/
    ├── css/
    │   ├── style.css              # Global styles, variables, layout
    │   ├── auth.css               # Login/Register styles
    │   ├── dashboard.css          # Dashboard-specific styles
    │   └── components.css         # Reusable component styles
    ├── js/
    │   ├── api.js                 # API client with JWT handling
    │   ├── auth.js                # Authentication helpers
    │   ├── charts.js              # Chart.js wrappers
    │   ├── utils.js               # Utility functions
    │   ├── app.js                 # Global app initialization
    │   ├── dashboard.js           # Student dashboard
    │   ├── mentor-dashboard.js    # Mentor dashboard
    │   ├── courses.js             # Course catalog
    │   ├── lesson-detail.js       # Lesson viewer
    │   ├── analytics.js           # Analytics charts
    │   ├── recommendations.js     # Recommendations
    │   ├── profile.js             # Profile page
    │   └── export.js              # CSV export
    ├── pages/
    │   ├── login.html
    │   ├── register.html
    │   ├── student-dashboard.html
    │   ├── mentor-dashboard.html
    │   ├── courses.html
    │   ├── lesson-detail.html
    │   ├── analytics.html
    │   ├── profile.html
    │   ├── recommendations.html
    │   └── export.html
    └── assets/
```

## Setup Instructions

### 1. Database Setup

```bash
# Create MySQL database
mysql -u root -p < student_dashboard.sql
```

### 2. Backend Setup

```bash
cd student-dashboard-API/backend

# Create virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with your MySQL credentials

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Seed sample data (10 courses, 50 lessons, 15 students, 3 mentors)
python manage.py seed_data

# Create superuser (optional)
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### 3. Frontend Setup

No build tools needed. Serve the frontend with any HTTP server:

```bash
# Using Python
cd student-dashboard-UI
python -m http.server 3000

# OR using VS Code Live Server extension
# OR just open the HTML files directly
```

### 4. Access the Application

- **Frontend**: http://localhost:3000/frontend/pages/login.html
- **Backend API**: http://localhost:8000/api/
- **API Docs (Swagger)**: http://localhost:8000/api/docs/
- **API Docs (ReDoc)**: http://localhost:8000/api/redoc/
- **Django Admin**: http://localhost:8000/admin/

### 5. Sample Accounts (from seed data)

| Role   | Email              | Password    |
|--------|--------------------|-------------|
| Mentor | mentor1@example.com | password123 |
| Mentor | mentor2@example.com | password123 |
| Mentor | mentor3@example.com | password123 |
| Student | student1@example.com | password123 |
| Student | student2@example.com | password123 |
| ...    | student15@example.com | password123 |

## API Endpoints

See [API.md](docs/API.md) for full documentation.

## Features

- **Role-based access**: Students and Mentors with separate dashboards
- **JWT Authentication**: Secure token-based auth with auto-refresh
- **Analytics**: Time-series activity tracking, completion rates, progress bars
- **Recommendations**: AI-powered next-lesson and weak-topic suggestions
- **CSV Export**: Download progress reports
- **Responsive Design**: Mobile-friendly glassmorphism UI
- **Interactive Charts**: Line, donut, and bar charts via Chart.js
