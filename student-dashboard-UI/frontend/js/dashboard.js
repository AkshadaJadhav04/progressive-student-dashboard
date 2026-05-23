import api from './api.js';
import { showLoading, showError, showEmpty, formatDuration, formatDate, getInitials, timeAgo } from './utils.js';
import { getUser, isAuthenticated } from './auth.js';
import { createLineChart, createDonutChart, createBarChart } from './charts.js';

async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  try {
    const data = await api.get('/dashboard/student/');
    renderStats(data);
    renderCourseProgress(data.course_progress);
    renderRecentLessons(data.recent_lessons);
    renderStreak(data.learning_streak);
  } catch (err) {
    showError(document.getElementById('stats-grid'), err.message);
  }

  try {
    const analyticsData = await api.get('/analytics/student/');
    renderCharts(analyticsData);
  } catch (err) {
    console.error('Analytics error:', err);
  }

  try {
    const recs = await api.get('/recommendations/');
    renderRecommendations(recs);
  } catch (err) {
    console.error('Recs error:', err);
  }

  try {
    const courses = await api.get('/courses/');
    renderActiveCourses(courses.results || courses);
  } catch (err) {
    console.error('Courses error:', err);
  }
}

function renderStats(data) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">✓</div>
      <div class="stat-value">${data.total_completed_lessons}</div>
      <div class="stat-label">Completed Lessons</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⏱</div>
      <div class="stat-value">${formatDuration(data.total_learning_time)}</div>
      <div class="stat-label">Total Learning Time</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-value">${data.overall_progress}%</div>
      <div class="stat-label">Overall Progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🔥</div>
      <div class="stat-value">${data.learning_streak}</div>
      <div class="stat-label">Day Streak</div>
    </div>
  `;
}

function renderCourseProgress(courses) {
  const container = document.getElementById('course-progress-list');
  if (!courses || courses.length === 0) {
    showEmpty(container, 'No courses enrolled', 'Enroll in courses to track your progress');
    return;
  }
  container.innerHTML = courses.map(c => `
    <div class="progress-bar-container">
      <div class="progress-bar-header">
        <span class="progress-bar-label">${c.course_title}</span>
        <span class="progress-bar-value">${c.completed_lessons}/${c.total_lessons} (${c.percentage}%)</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${c.percentage}%"></div>
      </div>
    </div>
  `).join('');
}

function renderRecentLessons(lessons) {
  const container = document.getElementById('recent-lessons');
  if (!lessons || lessons.length === 0) {
    showEmpty(container, 'No recent activity', 'Start learning to see your recent lessons');
    return;
  }
  container.innerHTML = lessons.slice(0, 5).map(l => `
    <div class="lesson-item">
      <div class="lesson-number">✓</div>
      <div class="lesson-info">
        <h4>${l.lesson_title}</h4>
        <span>${l.course_title} • ${timeAgo(l.created_at)}</span>
      </div>
    </div>
  `).join('');
}

function renderStreak(streak) {
  const el = document.getElementById('streak-display');
  if (el) {
    el.innerHTML = `
      <span class="streak-fire">🔥</span>
      <span class="streak-count">${streak}</span>
      <span class="streak-label">day streak</span>
    `;
  }
}

function renderCharts(data) {
  if (data.activity_trend && data.activity_trend.length > 0) {
    const labels = data.activity_trend.map(d => {
      const parts = d.date ? d.date.split('-') : (d.month || '').split('-');
      if (d.date) {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return d.month || '';
    });
    const counts = data.activity_trend.map(d => d.count);
    createLineChart('activityChart', labels, counts, 'Activities');
  }

  if (data.completed_vs_pending) {
    const { completed, pending } = data.completed_vs_pending;
    if (completed + pending > 0) {
      createDonutChart(
        'completionChart',
        ['Completed', 'Pending'],
        [completed, pending],
        ['#6bcb77', '#ff6584']
      );
    }
  }

  if (data.course_progress && data.course_progress.length > 0) {
    const labels = data.course_progress.map(c => c.course_title);
    const vals = data.course_progress.map(c => c.percentage);
    createBarChart('courseChart', labels, vals, 'Course Progress');
  }
}

function renderRecommendations(recs) {
  const container = document.getElementById('recommendations-widget');
  if (!container) return;
  if (!recs || recs.length === 0) {
    showEmpty(container, 'No recommendations yet', 'Generate recommendations to see suggested lessons');
    return;
  }
  container.innerHTML = recs.slice(0, 3).map(r => `
    <div class="rec-card">
      <div class="rec-icon">📚</div>
      <div class="rec-content">
        <h4>${r.course_title || 'Course'}</h4>
        <p>${r.reason}</p>
      </div>
      <span class="rec-score">${(r.score * 100).toFixed(0)}%</span>
    </div>
  `).join('');
}

function renderActiveCourses(courses) {
  const container = document.getElementById('active-courses');
  if (!container) return;
  if (!courses || courses.length === 0) {
    showEmpty(container, 'No courses', 'Browse courses to enroll');
    return;
  }
  container.innerHTML = courses.slice(0, 3).map(c => `
    <div class="course-card" onclick="window.location.href='/frontend/pages/courses.html'">
      <div class="course-thumbnail-placeholder">📖</div>
      <div class="course-body">
        <div class="course-title">${c.title}</div>
        <div class="course-desc">${c.description}</div>
        <div class="course-meta">
          <span>📚 ${c.total_lessons} lessons</span>
          <span>👤 ${c.mentor_name}</span>
        </div>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return;
  }
  loadDashboard();
});
