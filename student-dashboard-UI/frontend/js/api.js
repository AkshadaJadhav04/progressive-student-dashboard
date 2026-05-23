const API_BASE = 'http://localhost:8000/api';

const api = {
  getToken() {
    return localStorage.getItem('access_token');
  },

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },

  setTokens(access, refresh) {
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  },

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };

    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    let response = await fetch(url, config);

    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        config.headers['Authorization'] = `Bearer ${this.getToken()}`;
        response = await fetch(url, config);
      } else {
        this.clearTokens();
        window.location.href = '/frontend/pages/login.html';
        throw new Error('Session expired');
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      if (!response.ok) throw new Error('Export failed');
      return response;
    }

    const data = await response.json();
    if (!response.ok) {
      const msg = data.detail || data.error || JSON.stringify(data);
      throw new Error(msg);
    }
    return data;
  },

  async refreshToken() {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.getRefreshToken() }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.access, data.refresh);
      return true;
    } catch {
      return false;
    }
  },

  get(endpoint) { return this.request(endpoint); },

  post(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: data });
  },

  put(endpoint, data) {
    return this.request(endpoint, { method: 'PUT', body: data });
  },

  patch(endpoint, data) {
    return this.request(endpoint, { method: 'PATCH', body: data });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async downloadCSV(endpoint, filename) {
    const response = await this.request(endpoint);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default api;
