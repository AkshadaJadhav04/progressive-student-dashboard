import api from './api.js';
import { showLoading, showError, showToast, formatDate, formatDateTime, getInitials } from './utils.js';
import { isAuthenticated, fetchMe, getUser } from './auth.js';

async function loadProfile() {
  try {
    const user = await fetchMe();
    renderProfile(user);
  } catch (err) {
    showError(document.getElementById('profile-content'), err.message);
  }
}

function renderProfile(user) {
  document.getElementById('profile-content').innerHTML = `
    <div class="glass-card" style="text-align:center;padding:40px;margin-bottom:24px">
      <div style="width:80px;height:80px;border-radius:50%;background:var(--gradient-1);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;margin:0 auto 16px;color:white">
        ${getInitials(user.username)}
      </div>
      <h2 style="font-size:24px;margin-bottom:4px">${user.username}</h2>
      <p style="color:var(--text-muted);margin-bottom:4px">${user.email}</p>
      <span class="badge ${user.role === 'mentor' ? 'badge-mentor' : 'badge-student'}">${user.role}</span>
      <p style="margin-top:16px;color:var(--text-secondary)">${user.bio || 'No bio yet'}</p>
      <div style="display:flex;justify-content:center;gap:40px;margin-top:24px">
        <div><div style="font-size:20px;font-weight:700">${formatDate(user.date_joined)}</div><div style="font-size:12px;color:var(--text-muted)">Joined</div></div>
        <div><div style="font-size:20px;font-weight:700">${user.last_login ? formatDateTime(user.last_login) : '—'}</div><div style="font-size:12px;color:var(--text-muted)">Last Login</div></div>
      </div>
    </div>

    <div class="glass-card">
      <div class="glass-card-header">
        <div class="glass-card-title">Account Settings</div>
      </div>
      <form id="profile-form">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input class="form-input" id="edit-username" value="${user.username}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="edit-email" value="${user.email}" type="email" required>
        </div>
        <div class="form-group">
          <label class="form-label">Bio</label>
          <textarea class="form-input form-textarea" id="edit-bio">${user.bio || ''}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </form>
    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Note: The API doesn't have a user update endpoint in the current views,
    // so this shows a toast indicating it's a placeholder.
    showToast('Profile update would be sent to API', 'info');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return;
  }
  loadProfile();
});
