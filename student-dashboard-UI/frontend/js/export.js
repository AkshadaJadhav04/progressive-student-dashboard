import api from './api.js';
import { showToast } from './utils.js';
import { isAuthenticated, isStudent, isMentor } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return;
  }

  const studentExport = document.getElementById('export-student');
  const mentorExport = document.getElementById('export-mentor');

  if (studentExport) {
    studentExport.addEventListener('click', async () => {
      try {
        await api.downloadCSV('/export/student/csv/', 'student_progress.csv');
        showToast('CSV downloaded successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (mentorExport && isMentor()) {
    mentorExport.addEventListener('click', async () => {
      try {
        await api.downloadCSV('/export/mentor/csv/', 'mentor_report.csv');
        showToast('CSV downloaded successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (mentorExport && isStudent()) {
    mentorExport.style.opacity = '0.4';
    mentorExport.style.pointerEvents = 'none';
    mentorExport.querySelector('.export-info p').textContent = 'Mentor-only feature';
  }
});
