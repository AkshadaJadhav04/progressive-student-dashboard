import api from './api.js';
import { showLoading, showError, showEmpty, getInitials, formatDuration, formatDate } from './utils.js';
import { getUser, isAuthenticated } from './auth.js';
import { createBarChart } from './charts.js';

async function loadMentorDashboard() {
  try {
    const data = await api.get('/dashboard/mentor/');
    renderMentorStats(data);
    renderStudentsTable(data.students);
    renderWeakStudents(data.weak_students);
    renderEngagement(data.course_engagement);
    renderEngagementChart(data.course_engagement);
  } catch (err) {
    showError(document.getElementById('stats-grid'), err.message);
  }
}

function renderMentorStats(data) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-value">${data.total_students}</div>
      <div class="stat-label">Total Students</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⚠️</div>
      <div class="stat-value">${data.weak_students_count}</div>
      <div class="stat-label">Weak Students</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-value">${((data.total_students - data.weak_students_count) / Math.max(data.total_students, 1) * 100).toFixed(0)}%</div>
      <div class="stat-label">Pass Rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📚</div>
      <div class="stat-value">${data.course_engagement ? data.course_engagement.length : 0}</div>
      <div class="stat-label">Active Courses</div>
    </div>
  `;
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('students-table-body');
  if (!students || students.length === 0) {
    showEmpty(tbody, 'No students enrolled', 'Students will appear here once they enroll');
    return;
  }
  tbody.innerHTML = students.map(s => `
    <tr>
      <td>
        <div class="student-row">
          <div class="student-avatar-sm">${getInitials(s.student_name)}</div>
          <span>${s.student_name}</span>
        </div>
      </td>
      <td>${s.student_email}</td>
      <td><span class="badge ${s.total_completed > 0 ? 'badge-completed' : 'badge-pending'}">${s.total_completed}</span></td>
      <td>${formatDuration(s.total_time)}</td>
      <td>
        <div class="progress-bar-track" style="height:6px;width:100px">
          <div class="progress-bar-fill ${s.overall_progress < 30 ? '' : 'gradient-2'}" style="width:${s.overall_progress}%"></div>
        </div>
      </td>
      <td>${s.overall_progress}%</td>
      <td>🔥 ${s.streak}</td>
    </tr>
  `).join('');
}

function renderWeakStudents(weak) {
  const container = document.getElementById('weak-students');
  if (!container) return;
  if (!weak || weak.length === 0) {
    container.innerHTML = `
      <div class="alert alert-success">🎉 All students are performing well!</div>
    `;
    return;
  }
  container.innerHTML = weak.map(s => `
    <div class="alert alert-error mb-2">
      <strong>${s.student_name}</strong> — ${s.overall_progress}% progress (${s.student_email})
    </div>
  `).join('');
}

function renderEngagement(engagement) {
  const container = document.getElementById('engagement-list');
  if (!container) return;
  if (!engagement || engagement.length === 0) {
    showEmpty(container, 'No course data', 'Create courses to see engagement');
    return;
  }
  container.innerHTML = engagement.map(e => `
    <div class="progress-bar-container">
      <div class="progress-bar-header">
        <span class="progress-bar-label">${e.course_title}</span>
        <span class="progress-bar-value">${e.engagement_rate}%</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${e.engagement_rate}%"></div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
        ${e.enrolled_students} students • ${e.total_completions}/${e.enrolled_students * e.total_lessons} completions
      </div>
    </div>
  `).join('');
}

function renderEngagementChart(engagement) {
  if (!engagement || engagement.length === 0) return;
  const labels = engagement.map(e => e.course_title);
  const data = engagement.map(e => e.engagement_rate);
  createBarChart('engagementChart', labels, data, 'Engagement Rate %', '#00d2ff');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return;
  }
  loadMentorDashboard();
});
