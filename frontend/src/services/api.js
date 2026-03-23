const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cs456project.onrender.com';
const AUTH_TOKEN_KEY = 'studybuddy_auth_token';

export const authStorage = {
  getToken: () => localStorage.getItem(AUTH_TOKEN_KEY),
  setToken: (token) => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  },
  clearToken: () => localStorage.removeItem(AUTH_TOKEN_KEY)
};

const getAuthHeaders = (headers = {}) => {
  const token = authStorage.getToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

const parseJSON = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const fetchJSON = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: getAuthHeaders(options.headers || {})
  });

  const data = await parseJSON(response);
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

export const authAPI = {
  register: async (email, password, firstName, lastName) => {
    const data = await fetchJSON('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName })
    });
    authStorage.setToken(data.token);
    return data;
  },

  login: async (email, password) => {
    const data = await fetchJSON('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    authStorage.setToken(data.token);
    return data;
  },

  logout: async () => {
    authStorage.clearToken();
    return fetchJSON('/api/logout', { method: 'POST' });
  },

  getSession: async () => {
    try {
      const data = await fetchJSON('/api/session');
      if (data.token) {
        authStorage.setToken(data.token);
      }
      return data;
    } catch {
      return { authenticated: false };
    }
  },

  consumeOAuthRedirectToken: () => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const oauthError = url.searchParams.get('oauthError');

    if (token) {
      authStorage.setToken(token);
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }

    return { token, oauthError };
  }
};

export const coursesAPI = {
  getAll: async () => {
    try {
      const data = await fetchJSON('/api/courses');
      return data.courses || [];
    } catch (error) {
      console.error('Get courses error:', error);
      return [];
    }
  },

  getById: async (courseId) => {
    const data = await fetchJSON(`/api/courses/${courseId}`);
    return data.course;
  },

  create: async (courseName, courseCode, semester, color, icon) => {
    const data = await fetchJSON('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseName, courseCode, semester, color, icon })
    });
    return { success: true, courseID: data.course?.courseID, message: data.message };
  }
};

export const notesAPI = {
  getForCourse: async (courseId) => {
    try {
      const data = await fetchJSON(`/api/notes?courseId=${courseId}`);
      return data.notes || [];
    } catch (error) {
      console.error('Get notes error:', error);
      return [];
    }
  },

  getById: async (noteId) => {
    const data = await fetchJSON(`/api/notes/${noteId}`);
    return data.note;
  },

  create: async (courseId, title, content) => {
    const data = await fetchJSON('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, title, content })
    });
    return { success: true, noteID: data.note?.noteID, message: data.message };
  },

  upload: async (courseId, file, title) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    formData.append('title', title || file.name);

    return fetchJSON('/api/notes/upload', {
      method: 'POST',
      body: formData
    });
  },

  search: async (query, courseId) => {
    const data = await fetchJSON('/api/notes/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, courseId })
    });
    return data.results || [];
  },

  summarize: async (content) => fetchJSON('/api/notes/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
};

export const studySessionsAPI = {
  create: async (courseId, sessionType, durationMinutes) => {
    const data = await fetchJSON('/api/study-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, sessionType, durationMinutes })
    });
    return { success: true, sessionID: data.session?.sessionID, message: data.message };
  },

  getWeeklyStats: async (courseId) => {
    try {
      const url = courseId ? `/api/study-sessions/weekly-stats?courseId=${courseId}` : '/api/study-sessions/weekly-stats';
      return await fetchJSON(url);
    } catch (error) {
      console.error('Get weekly stats error:', error);
      return { hoursThisWeek: 0, weeklyGoal: 10, progress: 0, sessionsCount: 0 };
    }
  }
};
