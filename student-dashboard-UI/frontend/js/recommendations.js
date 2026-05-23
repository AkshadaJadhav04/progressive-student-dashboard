import api from './api.js';
import { showLoading, showError, showEmpty, showToast } from './utils.js';
import { isAuthenticated } from './auth.js';

async function loadRecommendations() {
  const container = document.getElementById('recommendations-list');
  try {
    showLoading(container);
    const data = await api.get('/recommendations/');
    renderRecommendations(data);
  } catch (err) {
    showError(container, err.message);
  }
}

function renderRecommendations(recs) {
  const container = document.getElementById('recommendations-list');
  if (!recs || recs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💡</div>
        <div class="empty-state-title">No recommendations yet</div>
        <div class="empty-state-text">Click "Generate Recommendations" to get personalized suggestions</div>
        <button class="btn btn-primary" onclick="generateRecs()">Generate Recommendations</button>
      </div>
    `;
    return;
  }

  const nextLessons = recs.filter(r => r.lesson);
  const courses = recs.filter(r => !r.lesson && r.course);

  let html = '';
  if (nextLessons.length > 0) {
    html += `<h3 style="margin-bottom:16px">📚 Next Lessons</h3>`;
    html += nextLessons.map(r => `
      <div class="rec-card">
        <div class="rec-icon">📖</div>
        <div class="rec-content">
          <h4>${r.lesson_title || 'Lesson'}</h4>
          <p>${r.course_title} — ${r.reason}</p>
        </div>
        <span class="rec-score">${(r.score * 100).toFixed(0)}%</span>
      </div>
    `).join('');
  }

  if (courses.length > 0) {
    html += `<h3 style="margin:24px 0 16px">🎯 Recommended Courses</h3>`;
    html += courses.map(r => `
      <div class="rec-card">
        <div class="rec-icon">🎓</div>
        <div class="rec-content">
          <h4>${r.course_title || 'Course'}</h4>
          <p>${r.reason}</p>
        </div>
        <span class="rec-score">${(r.score * 100).toFixed(0)}%</span>
      </div>
    `).join('');
  }

  html += `<div style="text-align:center;margin-top:24px">
    <button class="btn btn-primary" onclick="generateRecs()">🔄 Regenerate</button>
  </div>`;

  container.innerHTML = html;
}

window.generateRecs = async function() {
  const container = document.getElementById('recommendations-list');
  try {
    showLoading(container);
    const data = await api.post('/recommendations/');
    showToast('Recommendations generated!', 'success');
    renderRecommendations(data);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return;
  }
  loadRecommendations();
});
