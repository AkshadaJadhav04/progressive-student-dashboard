// ============================================================
// Progressive Student Dashboard - Complete JS Bundle
// ============================================================

// ===================== UTILS =====================
function formatDuration(minutes) {
  if (!minutes || minutes === 0) return '0 min';
  var hrs = Math.floor(minutes / 60);
  var mins = minutes % 60;
  if (hrs > 0) return hrs + 'h ' + mins + 'm';
  return mins + ' min';
}

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '\u2014';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = new Date();
  var d = new Date(dateStr);
  var diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
  return formatDate(dateStr);
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
}

function showToast(message, type) {
  if (!type) type = 'success';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3500);
}

function showLoading(container) {
  container.innerHTML = '<div class="loading-spinner"></div>';
}

function showError(container, message) {
  container.innerHTML = '<div class="alert alert-error">' + message + '</div>';
}

function showEmpty(container, title, text) {
  container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\uD83D\uDCED</div><div class="empty-state-title">' + title + '</div><div class="empty-state-text">' + text + '</div></div>';
}

// ===================== API CLIENT =====================
var API_BASE = 'http://localhost:8000/api';

var api = {
  getToken: function() { return localStorage.getItem('access_token'); },
  getRefreshToken: function() { return localStorage.getItem('refresh_token'); },
  setTokens: function(access, refresh) {
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  },
  clearTokens: function() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
  request: function(endpoint, options) {
    if (!options) options = {};
    var url = API_BASE + endpoint;
    var config = {
      headers: { 'Content-Type': 'application/json' },
      ...options
    };
    var token = this.getToken();
    if (token) config.headers['Authorization'] = 'Bearer ' + token;
    if (config.body && typeof config.body === 'object') config.body = JSON.stringify(config.body);

    var self = this;
    return fetch(url, config).then(function(response) {
      if (response.status === 401 && self.getRefreshToken()) {
        return self.refreshToken().then(function(refreshed) {
          if (refreshed) {
            config.headers['Authorization'] = 'Bearer ' + self.getToken();
            return fetch(url, config);
          }
          self.clearTokens();
          window.location.href = 'login.html';
          throw new Error('Session expired');
        });
      }
      return response;
    }).then(function(response) {
      var contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('text/csv') !== -1) {
        if (!response.ok) throw new Error('Export failed');
        return response;
      }
      return response.json().then(function(data) {
        if (!response.ok) {
          var msg = data.detail || data.error || '';
          if (!msg && typeof data === 'object') {
            var messages = [];
            for (var key in data) {
              if (Array.isArray(data[key])) {
                messages.push(data[key][0]);
              }
            }
            msg = messages.join(' ') || JSON.stringify(data);
          }
          throw new Error(msg);
        }
        return data;
      });
    });
  },
  refreshToken: function() {
    var self = this;
    return fetch(API_BASE + '/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: self.getRefreshToken() })
    }).then(function(res) {
      if (!res.ok) return false;
      return res.json().then(function(data) {
        self.setTokens(data.access, data.refresh);
        return true;
      });
    }).catch(function() { return false; });
  },
  get: function(endpoint) { return this.request(endpoint); },
  post: function(endpoint, data) { return this.request(endpoint, { method: 'POST', body: data }); },
  put: function(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: data }); },
  downloadCSV: function(endpoint, filename) {
    var self = this;
    return this.request(endpoint).then(function(response) {
      return response.blob().then(function(blob) {
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      });
    });
  }
};

// ===================== AUTH =====================
function getUser() {
  var u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

function isAuthenticated() { return !!api.getToken(); }

function isStudent() { var u = getUser(); return u && u.role === 'student'; }

function isMentor() { var u = getUser(); return u && u.role === 'mentor'; }

function requireAuth() {
  if (!isAuthenticated()) { window.location.href = 'login.html'; return false; }
  return true;
}

function loginUser(email, password) {
  return api.post('/auth/login/', { email: email, password: password }).then(function(data) {
    api.setTokens(data.access, data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  });
}

function registerUser(email, username, password, role) {
  return api.post('/auth/register/', { email: email, username: username, password: password, role: role }).then(function(data) {
    api.setTokens(data.access, data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  });
}

function logoutUser() {
  api.post('/auth/logout/', { refresh: api.getRefreshToken() }).catch(function() {});
  api.clearTokens();
  window.location.href = 'login.html';
}

function redirectAfterLogin(user) {
  if (user.role === 'mentor') window.location.href = 'mentor-dashboard.html';
  else window.location.href = 'student-dashboard.html';
}

// ===================== CHARTS =====================
function createLineChart(canvasId, labels, data, label, color) {
  if (!label) label = 'Activity';
  if (!color) color = '#6c63ff';
  var ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(26,23,64,0.95)',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.7)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1, cornerRadius: 8, padding: 12
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.4)', maxRotation: 45 } },
        y: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.4)' }, beginAtZero: true }
      }
    }
  });
}

function createDonutChart(canvasId, labels, data, colors) {
  if (!colors) colors = ['#6bcb77', '#ff6584'];
  var ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{ data: data, backgroundColor: colors, borderColor: 'rgba(15,12,41,0.8)', borderWidth: 3, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: 'rgba(255,255,255,0.7)', padding: 16, usePointStyle: true, font: { size: 12 } }
        },
        tooltip: {
          backgroundColor: 'rgba(26,23,64,0.95)',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.7)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1, cornerRadius: 8, padding: 12,
          callbacks: {
            label: function(ctx) {
              var total = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              return ' ' + ctx.label + ': ' + ctx.parsed + ' (' + (ctx.parsed / total * 100).toFixed(1) + '%)';
            }
          }
        }
      }
    }
  });
}

function createBarChart(canvasId, labels, data, label, color) {
  if (!label) label = 'Progress';
  if (!color) color = '#6c63ff';
  var ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        backgroundColor: data.map(function() { return color + '80'; }),
        borderColor: data.map(function() { return color; }),
        borderWidth: 2, borderRadius: 6, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(26,23,64,0.95)',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.7)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1, cornerRadius: 8, padding: 12
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', maxRotation: 45 } },
        y: { grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.4)', callback: function(v) { return v + '%'; } }, beginAtZero: true, max: 100 }
      }
    }
  });
}

// ===================== APP INIT =====================
function initApp() {
  if (!isAuthenticated()) return;
  var user = getUser();
  if (!user) return;

  var avatar = document.getElementById('profile-avatar');
  var name = document.getElementById('profile-name');
  if (avatar) avatar.textContent = getInitials(user.username);
  if (name) name.textContent = user.username;

  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logoutUser();
    });
  }

  var menuToggle = document.getElementById('menu-toggle');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('show');
    });
    if (overlay) {
      overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }
  }

  var notifBtn = document.getElementById('notification-btn');
  var notifDropdown = document.getElementById('notification-dropdown');
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      notifDropdown.classList.toggle('show');
    });
    document.addEventListener('click', function(e) {
      if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
        notifDropdown.classList.remove('show');
      }
    });
  }

  // Active nav highlighting
  var currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(function(item) {
    var href = item.getAttribute('href');
    if (href && href.indexOf(currentPage) !== -1) {
      item.classList.add('active');
    }
  });
}

// ============================================================
// PAGE-SPECIFIC SCRIPTS
// ============================================================

// ===================== LOGIN / REGISTER =====================
function initAuthPage() {
  if (localStorage.getItem('access_token')) {
    var u = getUser();
    if (u) { redirectAfterLogin(u); return; }
  }

  var loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('email').value;
      var password = document.getElementById('password').value;
      var btn = document.getElementById('login-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

      loginUser(email, password).then(function(user) {
        showToast('Welcome back!', 'success');
        redirectAfterLogin(user);
      }).catch(function(err) {
        var alert = document.getElementById('auth-alert');
        if (alert) alert.innerHTML = '<div class="alert alert-error">' + err.message + '</div>';
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
      });
    });
  }

  var registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var username = document.getElementById('username').value.trim();
      var email = document.getElementById('email').value.trim();
      var password = document.getElementById('password').value;
      var bio = document.getElementById('bio'); var bioVal = bio ? bio.value : '';
      var roleEl = document.querySelector('.role-option.active');
      var role = roleEl ? roleEl.dataset.role : 'student';

      // Replace spaces with underscores for valid Django username
      username = username.replace(/\s+/g, '_');

      var btn = document.getElementById('register-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }

      registerUser(email, username, password, role).then(function(user) {
        showToast('Account created!', 'success');
        redirectAfterLogin(user);
      }).catch(function(err) {
        var alert = document.getElementById('auth-alert');
        if (alert) alert.innerHTML = '<div class="alert alert-error">' + err.message + '</div>';
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
      });
    });
  }
}

function togglePassword() {
  var pwd = document.getElementById('password');
  if (pwd) pwd.type = pwd.type === 'password' ? 'text' : 'password';
}

function selectRole(el) {
  document.querySelectorAll('.role-option').forEach(function(r) { r.classList.remove('active'); });
  el.classList.add('active');
}

// ===================== STUDENT DASHBOARD =====================
function initStudentDashboard() {
  if (!requireAuth()) return;
  initApp();

  api.get('/dashboard/student/').then(function(data) {
    // Stats
    var grid = document.getElementById('stats-grid');
    if (grid) {
      grid.innerHTML = '<div class="stat-card"><div class="stat-icon">\u2713</div><div class="stat-value">' + data.total_completed_lessons + '</div><div class="stat-label">Completed Lessons</div></div>' +
        '<div class="stat-card"><div class="stat-icon">\u23F1</div><div class="stat-value">' + formatDuration(data.total_learning_time) + '</div><div class="stat-label">Total Learning Time</div></div>' +
        '<div class="stat-card"><div class="stat-icon">\uD83D\uDCCA</div><div class="stat-value">' + data.overall_progress + '%</div><div class="stat-label">Overall Progress</div></div>' +
        '<div class="stat-card"><div class="stat-icon">\uD83D\uDD25</div><div class="stat-value">' + data.learning_streak + '</div><div class="stat-label">Day Streak</div></div>';
    }

    // Streak
    var streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.textContent = data.learning_streak;

    // Course progress
    var progressList = document.getElementById('course-progress-list');
    if (progressList && data.course_progress && data.course_progress.length > 0) {
      progressList.innerHTML = data.course_progress.map(function(c) {
        return '<div class="progress-bar-container"><div class="progress-bar-header"><span class="progress-bar-label">' + c.course_title + '</span><span class="progress-bar-value">' + c.completed_lessons + '/' + c.total_lessons + ' (' + c.percentage + '%)</span></div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + c.percentage + '%"></div></div></div>';
      }).join('');
    } else if (progressList) {
      showEmpty(progressList, 'No courses enrolled', 'Enroll in courses to track your progress');
    }

    // Recent lessons
    var recent = document.getElementById('recent-lessons');
    if (recent && data.recent_lessons && data.recent_lessons.length > 0) {
      recent.innerHTML = data.recent_lessons.slice(0, 5).map(function(l) {
        return '<div class="lesson-item"><div class="lesson-number">\u2713</div><div class="lesson-info"><h4>' + l.lesson_title + '</h4><span>' + l.course_title + ' \u2022 ' + timeAgo(l.created_at) + '</span></div></div>';
      }).join('');
    } else if (recent) {
      showEmpty(recent, 'No recent activity', 'Start learning to see your recent lessons');
    }
  }).catch(function(err) {
    showError(document.getElementById('stats-grid'), err.message);
  });

  // Analytics charts
  api.get('/analytics/student/').then(function(aData) {
    if (aData.activity_trend && aData.activity_trend.length > 0) {
      var labels = aData.activity_trend.map(function(d) {
        if (d.date) { var dt = new Date(d.date); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        return d.month || '';
      });
      var counts = aData.activity_trend.map(function(d) { return d.count; });
      createLineChart('activityChart', labels, counts);
    }
    if (aData.completed_vs_pending) {
      var cp = aData.completed_vs_pending;
      if (cp.completed + cp.pending > 0) createDonutChart('completionChart', ['Completed', 'Pending'], [cp.completed, cp.pending]);
    }
    if (aData.course_progress && aData.course_progress.length > 0) {
      var cl = aData.course_progress.map(function(c) { return c.course_title; });
      var cv = aData.course_progress.map(function(c) { return c.percentage; });
      createBarChart('courseChart', cl, cv, 'Course Progress');
    }
  }).catch(function(err) { console.error(err); });

  // Recommendations widget
  api.get('/recommendations/').then(function(recs) {
    var recContainer = document.getElementById('recommendations-widget');
    if (!recContainer) return;
    if (!recs || recs.length === 0) {
      showEmpty(recContainer, 'No recommendations yet', 'Generate recommendations from the Recommendations page');
      return;
    }
    recContainer.innerHTML = recs.slice(0, 3).map(function(r) {
      return '<div class="rec-card"><div class="rec-icon">\uD83D\uDCDA</div><div class="rec-content"><h4>' + (r.course_title || 'Course') + '</h4><p>' + r.reason + '</p></div><span class="rec-score">' + (r.score * 100).toFixed(0) + '%</span></div>';
    }).join('');
  }).catch(function(err) { console.error(err); });

  // Courses
  api.get('/courses/').then(function(cData) {
    var courses = cData.results || cData;
    var ac = document.getElementById('active-courses');
    if (!ac) return;
    if (!courses || courses.length === 0) { showEmpty(ac, 'No courses', 'Browse courses to enroll'); return; }
    ac.innerHTML = courses.slice(0, 3).map(function(c) {
      return '<div class="course-card" onclick="window.location.href=\'courses.html\'"><div class="course-thumbnail-placeholder">\uD83D\uDCD6</div><div class="course-body"><div class="course-title">' + c.title + '</div><div class="course-desc">' + c.description + '</div><div class="course-meta"><span>\uD83D\uDCDA ' + c.total_lessons + ' lessons</span><span>\uD83D\uDC64 ' + c.mentor_name + '</span></div></div></div>';
    }).join('');
  }).catch(function(err) { console.error(err); });
}

// ===================== MENTOR DASHBOARD =====================
function initMentorDashboard() {
  if (!requireAuth()) return;
  initApp();

  api.get('/dashboard/mentor/').then(function(data) {
    var grid = document.getElementById('stats-grid');
    if (grid) {
      grid.innerHTML = '<div class="stat-card"><div class="stat-icon">\uD83D\uDC65</div><div class="stat-value">' + data.total_students + '</div><div class="stat-label">Total Students</div></div>' +
        '<div class="stat-card"><div class="stat-icon">\u26A0\uFE0F</div><div class="stat-value">' + data.weak_students_count + '</div><div class="stat-label">Weak Students</div></div>' +
        '<div class="stat-card"><div class="stat-icon">\uD83D\uDCCA</div><div class="stat-value">' + ((data.total_students - data.weak_students_count) / Math.max(data.total_students, 1) * 100).toFixed(0) + '%</div><div class="stat-label">Pass Rate</div></div>' +
        '<div class="stat-card"><div class="stat-icon">\uD83D\uDCDA</div><div class="stat-value">' + (data.course_engagement ? data.course_engagement.length : 0) + '</div><div class="stat-label">Active Courses</div></div>';
    }

    // Students table
    var tbody = document.getElementById('students-table-body');
    if (tbody && data.students && data.students.length > 0) {
      tbody.innerHTML = data.students.map(function(s) {
        return '<tr><td><div class="student-row"><div class="student-avatar-sm">' + getInitials(s.student_name) + '</div><span>' + s.student_name + '</span></div></td><td>' + s.student_email + '</td><td><span class="badge ' + (s.total_completed > 0 ? 'badge-completed' : 'badge-pending') + '">' + s.total_completed + '</span></td><td>' + formatDuration(s.total_time) + '</td><td><div class="progress-bar-track" style="height:6px;width:100px"><div class="progress-bar-fill ' + (s.overall_progress < 30 ? '' : 'gradient-2') + '" style="width:' + s.overall_progress + '%"></div></div></td><td>' + s.overall_progress + '%</td><td>\uD83D\uDD25 ' + s.streak + '</td></tr>';
      }).join('');
    } else if (tbody) {
      showEmpty(tbody, 'No students', 'Students will appear once they enroll');
    }

    // Weak students
    var weak = document.getElementById('weak-students');
    if (weak) {
      if (!data.weak_students || data.weak_students.length === 0) {
        weak.innerHTML = '<div class="alert alert-success">\uD83C\uDF89 All students are performing well!</div>';
      } else {
        weak.innerHTML = data.weak_students.map(function(s) {
          return '<div class="alert alert-error" style="margin-bottom:8px"><strong>' + s.student_name + '</strong> \u2014 ' + s.overall_progress + '% progress (' + s.student_email + ')</div>';
        }).join('');
      }
    }

    // Engagement list
    var eng = document.getElementById('engagement-list');
    if (eng && data.course_engagement && data.course_engagement.length > 0) {
      eng.innerHTML = data.course_engagement.map(function(e) {
        return '<div class="progress-bar-container"><div class="progress-bar-header"><span class="progress-bar-label">' + e.course_title + '</span><span class="progress-bar-value">' + e.engagement_rate + '%</span></div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + e.engagement_rate + '%"></div></div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + e.enrolled_students + ' students \u2022 ' + e.total_completions + '/' + (e.enrolled_students * e.total_lessons) + ' completions</div></div>';
      }).join('');
    } else if (eng) {
      showEmpty(eng, 'No course data', 'Create courses to see engagement');
    }

    // Engagement chart
    if (data.course_engagement && data.course_engagement.length > 0) {
      createBarChart('engagementChart', data.course_engagement.map(function(e) { return e.course_title; }), data.course_engagement.map(function(e) { return e.engagement_rate; }), 'Engagement Rate %', '#00d2ff');
    }
  }).catch(function(err) {
    showError(document.getElementById('stats-grid'), err.message);
  });
}

// ===================== COURSES =====================
function initCourses() {
  if (!requireAuth()) return;
  initApp();
  var allCourses = [];

  function renderCourses(courses) {
    var container = document.getElementById('courses-grid');
    if (!container) return;
    if (!courses || courses.length === 0) { showEmpty(container, 'No courses available', 'Check back later'); return; }
    container.innerHTML = courses.map(function(c) {
      return '<div class="course-card" onclick="window.location.href=\'lesson-detail.html?course_id=' + c.id + '\'"><div class="course-thumbnail-placeholder">\uD83D\uDCD6</div><div class="course-body"><div class="course-title">' + c.title + '</div><div class="course-desc">' + c.description + '</div><div class="course-meta"><span>\uD83D\uDCDA ' + c.total_lessons + ' lessons</span><span>\u23F1 ' + c.total_duration + ' min</span><span>\uD83D\uDC64 ' + c.mentor_name + '</span></div></div></div>';
    }).join('');
    var count = document.getElementById('course-count');
    if (count) count.textContent = courses.length + ' courses';
  }

  api.get('/courses/').then(function(data) {
    allCourses = data.results || data;
    renderCourses(allCourses);
  }).catch(function(err) {
    showError(document.getElementById('courses-grid'), err.message);
  });

  var searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      var search = this.value.toLowerCase();
      var filtered = allCourses.filter(function(c) {
        return c.title.toLowerCase().indexOf(search) !== -1 || c.description.toLowerCase().indexOf(search) !== -1;
      });
      renderCourses(filtered);
    });
  }
}

// ===================== LESSON DETAIL =====================
function initLessonDetail() {
  if (!requireAuth()) return;
  initApp();

  var params = new URLSearchParams(window.location.search);
  var courseId = params.get('course_id');
  var lessonId = params.get('lesson_id');

  if (!courseId && !lessonId) {
    showError(document.getElementById('lesson-content'), 'No course or lesson specified');
    return;
  }

  if (courseId) {
    api.get('/courses/' + courseId + '/').then(function(course) {
      var title = document.getElementById('course-title');
      if (title) title.textContent = course.title;
      var desc = document.getElementById('course-description');
      if (desc) desc.textContent = course.description;
      var meta = document.getElementById('course-meta');
      if (meta) meta.innerHTML = '<span>\uD83D\uDC64 ' + course.mentor_name + '</span><span>\uD83D\uDCDA ' + course.total_lessons + ' lessons</span><span>\u23F1 ' + formatDuration(course.total_duration) + '</span><span>\uD83D\uDC65 ' + course.student_count + ' students</span>';

      var lessonsList = document.getElementById('lessons-list');
      if (lessonsList && course.lessons && course.lessons.length > 0) {
        lessonsList.innerHTML = course.lessons.map(function(l) {
          return '<div class="lesson-item" onclick="window.location.href=\'lesson-detail.html?lesson_id=' + l.id + '\'"><div class="lesson-number">' + l.order + '</div><div class="lesson-info"><h4>' + l.title + '</h4><span>' + formatDuration(l.duration) + '</span></div></div>';
        }).join('');
      } else if (lessonsList) {
        lessonsList.innerHTML = '<p style="color:var(--text-muted)">No lessons available</p>';
      }
    }).catch(function(err) {
      showError(document.getElementById('lesson-content'), err.message);
    });
  }

  if (lessonId) {
    api.get('/lessons/' + lessonId + '/').then(function(lesson) {
      var container = document.getElementById('lesson-detail');
      if (container) {
        container.innerHTML = '<div class="glass-card" style="margin-bottom:24px"><h2 style="font-size:22px;margin-bottom:8px">' + lesson.title + '</h2><p style="color:var(--text-muted);margin-bottom:16px">' + lesson.course_title + ' \u2022 ' + formatDuration(lesson.duration) + '</p><div style="background:rgba(255,255,255,0.05);border-radius:var(--radius-md);padding:24px;margin-bottom:20px"><p style="color:var(--text-secondary);line-height:1.8">' + lesson.content + '</p></div>' + (lesson.video_url ? '<div style="margin-bottom:20px"><p style="color:var(--text-muted);margin-bottom:8px">\uD83D\uDCF9 Video: <a href="' + lesson.video_url + '" target="_blank">' + lesson.video_url + '</a></p></div>' : '') + '<div style="display:flex;gap:12px"><button class="btn btn-primary" onclick="trackComplete(' + lesson.id + ')">\u2713 Mark as Complete</button><button class="btn btn-secondary" onclick="window.history.back()">\u2190 Back</button></div></div>';
      }
    }).catch(function(err) {
      showError(document.getElementById('lesson-detail'), err.message);
    });
  }
}

function trackComplete(lessonId) {
  api.post('/track-activity/', { lesson_id: lessonId, event_type: 'lesson_complete', duration: 0 }).then(function() {
    showToast('Lesson completed!', 'success');
  }).catch(function(err) {
    showToast(err.message, 'error');
  });
}

// ===================== ANALYTICS =====================
function initAnalytics() {
  if (!requireAuth()) return;
  initApp();
  loadAnalytics('weekly');

  function loadAnalytics(period) {
    api.get('/analytics/student/?period=' + period).then(function(data) {
      if (data.activity_trend && data.activity_trend.length > 0) {
        var labels = data.activity_trend.map(function(d) {
          if (d.date) { var dt = new Date(d.date); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
          return d.month || '';
        });
        var counts = data.activity_trend.map(function(d) { return d.count; });
        Chart.getChart('activityLineChart') ? Chart.getChart('activityLineChart').destroy() : null;
        createLineChart('activityLineChart', labels, counts, period === 'monthly' ? 'Monthly Activity' : 'Daily Activity');
      }
      if (data.completed_vs_pending) {
        Chart.getChart('completionDonutChart') ? Chart.getChart('completionDonutChart').destroy() : null;
        createDonutChart('completionDonutChart', ['Completed', 'Pending'], [data.completed_vs_pending.completed, data.completed_vs_pending.pending]);
      }
      if (data.course_progress && data.course_progress.length > 0) {
        Chart.getChart('courseBarChart') ? Chart.getChart('courseBarChart').destroy() : null;
        createBarChart('courseBarChart', data.course_progress.map(function(c) { return c.course_title; }), data.course_progress.map(function(c) { return c.percentage; }), 'Progress %', '#ffd93d');
      }
    }).catch(function(err) {
      console.error(err);
    });
  }

  document.querySelectorAll('.period-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.period-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      loadAnalytics(btn.dataset.period);
    });
  });
}

// ===================== RECOMMENDATIONS =====================
function initRecommendations() {
  if (!requireAuth()) return;
  initApp();
  loadRecs();

  function loadRecs() {
    var container = document.getElementById('recommendations-list');
    showLoading(container);
    api.get('/recommendations/').then(function(recs) {
      if (!recs || recs.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\uD83D\uDCA1</div><div class="empty-state-title">No recommendations yet</div><div class="empty-state-text">Click "Generate Recommendations" to get personalized suggestions</div><button class="btn btn-primary" onclick="generateRecs()">Generate Recommendations</button></div>';
        return;
      }
      var nextLessons = recs.filter(function(r) { return r.lesson; });
      var courses = recs.filter(function(r) { return !r.lesson && r.course; });
      var html = '';
      if (nextLessons.length > 0) {
        html += '<h3 style="margin-bottom:16px">\uD83D\uDCDA Next Lessons</h3>';
        html += nextLessons.map(function(r) { return '<div class="rec-card"><div class="rec-icon">\uD83D\uDCD6</div><div class="rec-content"><h4>' + (r.lesson_title || 'Lesson') + '</h4><p>' + r.course_title + ' \u2014 ' + r.reason + '</p></div><span class="rec-score">' + (r.score * 100).toFixed(0) + '%</span></div>'; }).join('');
      }
      if (courses.length > 0) {
        html += '<h3 style="margin:24px 0 16px">\uD83C\uDFAF Recommended Courses</h3>';
        html += courses.map(function(r) { return '<div class="rec-card"><div class="rec-icon">\uD83C\uDF93</div><div class="rec-content"><h4>' + (r.course_title || 'Course') + '</h4><p>' + r.reason + '</p></div><span class="rec-score">' + (r.score * 100).toFixed(0) + '%</span></div>'; }).join('');
      }
      html += '<div style="text-align:center;margin-top:24px"><button class="btn btn-primary" onclick="generateRecs()">\uD83D\uDD04 Regenerate</button></div>';
      container.innerHTML = html;
    }).catch(function(err) {
      showError(container, err.message);
    });
  }

  window.generateRecs = function() {
    var container = document.getElementById('recommendations-list');
    showLoading(container);
    api.post('/recommendations/').then(function() {
      showToast('Recommendations generated!', 'success');
      loadRecs();
    }).catch(function(err) {
      showToast(err.message, 'error');
    });
  };
}

// ===================== PROFILE =====================
function initProfile() {
  if (!requireAuth()) return;
  initApp();

  api.get('/auth/me/').then(function(user) {
    localStorage.setItem('user', JSON.stringify(user));
    var container = document.getElementById('profile-content');
    container.innerHTML = '<div class="glass-card" style="text-align:center;padding:40px;margin-bottom:24px"><div style="width:80px;height:80px;border-radius:50%;background:var(--gradient-1);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;margin:0 auto 16px;color:white">' + getInitials(user.username) + '</div><h2 style="font-size:24px;margin-bottom:4px">' + user.username + '</h2><p style="color:var(--text-muted);margin-bottom:4px">' + user.email + '</p><span class="badge ' + (user.role === 'mentor' ? 'badge-mentor' : 'badge-student') + '">' + user.role + '</span><p style="margin-top:16px;color:var(--text-secondary)">' + (user.bio || 'No bio yet') + '</p><div style="display:flex;justify-content:center;gap:40px;margin-top:24px"><div><div style="font-size:20px;font-weight:700">' + formatDate(user.date_joined) + '</div><div style="font-size:12px;color:var(--text-muted)">Joined</div></div><div><div style="font-size:20px;font-weight:700">' + (user.last_login ? formatDateTime(user.last_login) : '\u2014') + '</div><div style="font-size:12px;color:var(--text-muted)">Last Login</div></div></div></div>' +
      '<div class="glass-card"><div class="glass-card-header"><div class="glass-card-title">Account Settings</div></div><form id="profile-form"><div class="form-group"><label class="form-label">Username</label><input class="form-input" id="edit-username" value="' + user.username + '" required></div><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="edit-email" value="' + user.email + '" type="email" required></div><div class="form-group"><label class="form-label">Bio</label><textarea class="form-input form-textarea" id="edit-bio">' + (user.bio || '') + '</textarea></div><button type="submit" class="btn btn-primary">Save Changes</button></form></div>';

    document.getElementById('profile-form').addEventListener('submit', function(e) {
      e.preventDefault();
      showToast('Profile update would be sent to API', 'info');
    });
  }).catch(function(err) {
    showError(document.getElementById('profile-content'), err.message);
  });
}

// ===================== EXPORT =====================
function initExport() {
  if (!requireAuth()) return;
  initApp();

  var studentExport = document.getElementById('export-student');
  if (studentExport) {
    studentExport.addEventListener('click', function() {
      api.downloadCSV('/export/student/csv/', 'student_progress.csv').then(function() {
        showToast('CSV downloaded!', 'success');
      }).catch(function(err) {
        showToast(err.message, 'error');
      });
    });
  }

  var mentorExport = document.getElementById('export-mentor');
  if (mentorExport) {
    if (isMentor()) {
      mentorExport.addEventListener('click', function() {
        api.downloadCSV('/export/mentor/csv/', 'mentor_report.csv').then(function() {
          showToast('CSV downloaded!', 'success');
        }).catch(function(err) {
          showToast(err.message, 'error');
        });
      });
    } else {
      mentorExport.style.opacity = '0.4';
      mentorExport.style.pointerEvents = 'none';
      var p = mentorExport.querySelector('.export-info p');
      if (p) p.textContent = 'Mentor-only feature';
    }
  }
}

// ============================================================
// INIT DISPATCHER
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  var page = window.location.pathname.split('/').pop();

  if (page === 'login.html' || page === 'register.html') {
    initAuthPage();
    return;
  }

  if (page === 'student-dashboard.html') { initStudentDashboard(); return; }
  if (page === 'mentor-dashboard.html') { initMentorDashboard(); return; }
  if (page === 'courses.html') { initCourses(); return; }
  if (page === 'lesson-detail.html') { initLessonDetail(); return; }
  if (page === 'analytics.html') { initAnalytics(); return; }
  if (page === 'recommendations.html') { initRecommendations(); return; }
  if (page === 'profile.html') { initProfile(); return; }
  if (page === 'export.html') { initExport(); return; }

  // Fallback for any other page
  if (isAuthenticated()) initApp();
});
