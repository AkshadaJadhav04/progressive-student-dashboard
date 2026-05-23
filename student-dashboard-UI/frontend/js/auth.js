import api from './api.js';

export function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function isAuthenticated() {
  return !!api.getToken();
}

export function isStudent() {
  const u = getUser();
  return u && u.role === 'student';
}

export function isMentor() {
  const u = getUser();
  return u && u.role === 'mentor';
}

export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/frontend/pages/login.html';
    return false;
  }
  return true;
}

export function requireRole(role) {
  if (!requireAuth()) return false;
  const u = getUser();
  if (u.role !== role) {
    const redirect = u.role === 'mentor' ? '/frontend/pages/mentor-dashboard.html' : '/frontend/pages/student-dashboard.html';
    window.location.href = redirect;
    return false;
  }
  return true;
}

export async function login(email, password) {
  const data = await api.post('/auth/login/', { email, password });
  api.setTokens(data.access, data.refresh);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
}

export async function register(email, username, password, role) {
  const data = await api.post('/auth/register/', { email, username, password, role });
  api.setTokens(data.access, data.refresh);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout/', { refresh: api.getRefreshToken() });
  } catch (e) { /* ignore */ }
  api.clearTokens();
  window.location.href = '/frontend/pages/login.html';
}

export async function fetchMe() {
  const data = await api.get('/auth/me/');
  localStorage.setItem('user', JSON.stringify(data));
  return data;
}

export function redirectAfterLogin(user) {
  if (user.role === 'mentor') {
    window.location.href = '/frontend/pages/mentor-dashboard.html';
  } else {
    window.location.href = '/frontend/pages/student-dashboard.html';
  }
}
