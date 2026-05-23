import api from './api.js';
import { showLoading, showError, showEmpty, showToast } from './utils.js';
import { isAuthenticated, getUser } from './auth.js';

let allCourses = [];

async function loadCourses() {
  const container = document.getElementById('courses-grid');
  try {
    showLoading(container);
    const data = await api.get('/courses/');
    allCourses = data.results || data;
    renderCourses(allCourses);
  } catch (err) {
    showError(container, err.message);
  }
}

function renderCourses(courses) {
  const container = document.getElementById('courses-grid');
  if (!courses || courses.length === 0) {
    showEmpty(container, 'No courses available', 'Check back later for new courses');
    return;
  }
  container.innerHTML = courses.map(c => `
    <div class="course-card" onclick="viewCourse(${c.id})">
      <div class="course-thumbnail-placeholder">📖</div>
      <div class="course-body">
        <div class="course-title">${c.title}</div>
        <div class="course-desc">${c.description}</div>
        <div class="course-meta">
          <span>📚 ${c.total_lessons} lessons</span>
          <span>⏱ ${c.total_duration} min</span>
          <span>👤 ${c.mentor_name}</span>
        </div>
      </div>
    </div>
  `).join('');
}

window.viewCourse = function(courseId) {
  window.location.href = `/frontend/pages/lesson-detail.html?course_id=${courseId}`;
};

function filterCourses() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const filtered = allCourses.filter(c =>
    c.title.toLowerCase().includes(search) ||
    c.description.toLowerCase().includes(search)
  );
  renderCourses(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return;
  }
  loadCourses();
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterCourses);
  }
});
