@echo off
echo ========================================
echo  Progressive Student Dashboard - Starter
echo ========================================
echo.

echo [1/2] Starting Backend (Django API) on port 8000...
start "Django Backend" cmd /c "cd /d "%~dp0student-dashboard-API" && python manage.py runserver"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend on port 3000...
start "Frontend Server" cmd /c "cd /d "%~dp0student-dashboard-UI" && python -m http.server 3000"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo  Both servers started!
echo.
echo  Frontend: http://localhost:3000/frontend/login.html
echo  Backend:  http://localhost:8000/api/
echo  API Docs: http://localhost:8000/api/docs/
echo.
echo  Login: student1@example.com / password123
echo  Or:    mentor1@example.com / password123
echo ========================================
pause
