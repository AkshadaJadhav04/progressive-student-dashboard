import api from './api.js';
import { showLoading, showError, showToast, formatDuration, formatDate } from './utils.js';
import { isAuthenticated } from './auth.js';

async function loadLessonDetail() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('course_id');
  const lessonId = params.get('lesson_id');

  if (!courseId && !lessonId) {
    showError(document.getElementById('lesson-content'), 'No course or lesson specified');
    return;
  }

  try {
    if (courseId) {
      const course = await api.get(`/courses/${courseId}/`);
      renderCourseDetail(course);
      renderLessons(course.lessons || []);
    }
    if (lessonId) {
      const lesson = await api.get(`/lessons/${lessonId}/`);
      renderLessonDetail(lesson);
    }
  } catch (err) {
    showError(document.getElementById('lesson-content'), err.message);
  }
}

function renderCourseDetail(course) {
  document.getElementById('course-title').textContent = course.title;
  document.getElementById('course-description').textContent = course.description;
  document.getElementById('course-meta').innerHTML = `
    <span>👤 ${course.mentor_name}</span>
    <span>📚 ${course.total_lessons} lessons</span>
    <span>⏱ ${formatDuration(course.total_duration)}</span>
    <span>👥 ${course.student_count} students</span>
  `;
}

function renderLessons(lessons) {
  const container = document.getElementById('lessons-list');
  if (!lessons || lessons.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">No lessons available</p>';
    return;
  }
  container.innerHTML = lessons.map(l => `
    <div class="lesson-item" onclick="window.location.href='/frontend/pages/lesson-detail.html?lesson_id=${l.id}'">
      <div class="lesson-number">${l.order}</div>
      <div class="lesson-info">
        <h4>${l.title}</h4>
        <span>${formatDuration(l.duration)}</span>
      </div>
    </div>
  `).join('');
}

function renderLessonDetail(lesson) {
  const container = document.getElementById('lesson-detail');
  container.innerHTML = `
    <div class="glass-card" style="margin-bottom:24px">
      <h2 style="font-size:22px;margin-bottom:8px">${lesson.title}</h2>
      <p style="color:var(--text-muted);margin-bottom:16px">${lesson.course_title} • ${formatDuration(lesson.duration)}</p>
      <div style="background:rgba(255,255,255,0.05);border-radius:var(--radius-md);padding:24px;margin-bottom:20px">
        <p style="color:var(--text-secondary);line-height:1.8">${lesson.content}</p>
      </div>
      ${lesson.video_url ? `
        <div style="margin-bottom:20px">
          <p style="color:var(--text-muted);margin-bottom:8px">📹 Video: <a href="${lesson.video_url}" target="_blank">${lesson.video_url}</a></p>
        </div>
      ` : ''}
      <div style="display:flex;gap:12px">
        <button class="btn btn-primary" onclick="trackComplete(${lesson.id})">✓ Mark as Complete</button>
        <button class="btn btn-secondary" onclick="window.history.back()">← Back</button>
      </div>
    </div>
  `;
}

window.trackComplete = async function(lessonId) {
  try {
    await api.post('/track-activity/', {
      lesson_id: lessonId,
      event_type: 'lesson_complete',
      duration: 0,
    });
    showToast('Lesson completed! 🎉', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return;
  }
  loadLessonDetail();
});
