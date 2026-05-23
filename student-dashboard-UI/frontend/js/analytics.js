import api from './api.js';
import { showLoading, showError, showEmpty } from './utils.js';
import { isAuthenticated } from './auth.js';
import { createLineChart, createDonutChart, createBarChart } from './charts.js';

let currentPeriod = 'weekly';

async function loadAnalytics(period = 'weekly') {
  currentPeriod = period;
  const chartRow = document.getElementById('charts-row');
  try {
    const data = await api.get(`/analytics/student/?period=${period}`);
    renderActivityChart(data, period);
    renderCompletionChart(data);
    renderCourseChart(data);
  } catch (err) {
    showError(chartRow, err.message);
  }
}

function renderActivityChart(data, period) {
  const container = document.getElementById('activity-chart-container');
  if (!data.activity_trend || data.activity_trend.length === 0) {
    showEmpty(container, 'No activity data', 'Start learning to see your activity trends');
    return;
  }
  const labels = data.activity_trend.map(d => {
    if (d.date) {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return d.month || '';
  });
  const counts = data.activity_trend.map(d => d.count);
  const existing = Chart.getChart('activityLineChart');
  if (existing) existing.destroy();
  createLineChart('activityLineChart', labels, counts, period === 'monthly' ? 'Monthly Activity' : 'Daily Activity');
}

function renderCompletionChart(data) {
  const container = document.getElementById('completion-chart-container');
  if (!data.completed_vs_pending) {
    showEmpty(container, 'No completion data', 'Complete lessons to see your stats');
    return;
  }
  const { completed, pending } = data.completed_vs_pending;
  const existing = Chart.getChart('completionDonutChart');
  if (existing) existing.destroy();
  createDonutChart('completionDonutChart', ['Completed', 'Pending'], [completed, pending], ['#6bcb77', '#ff6584']);
}

function renderCourseChart(data) {
  const container = document.getElementById('course-chart-container');
  if (!data.course_progress || data.course_progress.length === 0) {
    showEmpty(container, 'No course progress', 'Enroll in courses to see progress');
    return;
  }
  const labels = data.course_progress.map(c => c.course_title);
  const vals = data.course_progress.map(c => c.percentage);
  const existing = Chart.getChart('courseBarChart');
  if (existing) existing.destroy();
  createBarChart('courseBarChart', labels, vals, 'Progress %', '#ffd93d');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return;
  }
  loadAnalytics('weekly');

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadAnalytics(btn.dataset.period);
    });
  });
});
