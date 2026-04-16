//const API_BASE_URL = 'https://cs456project.onrender.com';
const API_BASE_URL = 'https://cs456project.onrender.com';
const AUTH_TOKEN_KEY = 'studybuddy_auth_token';

const buildUrl = (path) => `${API_BASE_URL}${path}`;

export const authTokenStore = {
  get: () => localStorage.getItem(AUTH_TOKEN_KEY),
  set: (token) => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  },
  clear: () => localStorage.removeItem(AUTH_TOKEN_KEY),
};

const apiFetch = (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = authTokenStore.get();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
};



// Auth endpoints
export const authAPI = {
  register: async (email, password, firstName, lastName) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/register`, {
      const response = await apiFetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, firstName, lastName })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      //return await response.json();
      const data = await response.json();
      authTokenStore.set(data.authToken);
      return data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  login: async (email, password) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/login`, {
      const response = await apiFetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      //return await response.json();
      const data = await response.json();
      authTokenStore.set(data.authToken);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/logout`, {
      const response = await apiFetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      authTokenStore.clear();
      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  getMe: async () => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      const response = await apiFetch(`${API_BASE_URL}/api/user/me`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return await response.json();
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  },

  getSession: async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/session`);
      if (!response.ok) return { authenticated: false };
      const data = await response.json();
      authTokenStore.set(data.authToken);
      return data;
    } catch (error) {
      console.error('Get session error:', error);
      return { authenticated: false };
    }
  },

  updateProfile: async (userData) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      const response = await apiFetch(`${API_BASE_URL}/api/user/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/user/me/password`, {
      const response = await apiFetch(`${API_BASE_URL}/api/user/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Password change failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }
};

// Courses endpoints
export const coursesAPI = {
  getAll: async () => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/courses`, {
      const response = await apiFetch(`${API_BASE_URL}/api/courses`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      
      const data = await response.json();
      return data.courses || data || [];
    } catch (error) {
      console.error('Get courses error:', error);
      return [];
    }
  },

  create: async (courseName, courseCode, semester, color, icon, startDate, endDate) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/courses`, {
      const response = await apiFetch(`${API_BASE_URL}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseName, courseCode, semester, color, icon, startDate, endDate })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create course');
      }
      
      const data = await response.json();
      return { 
        success: true, 
        courseID: data.course?.courseID,
        message: data.message 
      };
    } catch (error) {
      console.error('Create course error:', error);
      throw error;
    }
  },

 update: async (courseId, updates) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
      const response = await apiFetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update course');
      }

      return await response.json();
    } catch (error) {
      console.error('Update course error:', error);
      throw error;
    }
  },

  delete: async (courseId) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
      const response = await apiFetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete course');
      }

      return await response.json();
    } catch (error) {
      console.error('Delete course error:', error);
      throw error;
    }
  }
};



// Notes endpoints
export const notesAPI = {
  getForCourse: async (courseId) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/notes?courseId=${courseId}`, {
      const response = await apiFetch(`${API_BASE_URL}/api/notes?courseId=${courseId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch notes');
      
      const data = await response.json();
      return data.notes || [];
    } catch (error) {
      console.error('Get notes error:', error);
      return [];
    }
  },

  create: async (courseId, title, content) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/notes`, {
      const response = await apiFetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId, title, content })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create note');
      }
      
      const data = await response.json();
      return { 
        success: true, 
        noteID: data.note?.noteID,
        message: data.message
      };
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  },

  update: async (noteId, title, content) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
      const response = await apiFetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, content })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update note');
      }
      return await response.json();
    } catch (error) {
      console.error('Update note error:', error);
      throw error;
    }
  },

  delete: async (noteId) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
      const response = await apiFetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete note');
      }
      return await response.json();
    } catch (error) {
      console.error('Delete note error:', error);
      throw error;
    }
  },

  summarize: async (content) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/notes/summarize`, {
      const response = await apiFetch(`${API_BASE_URL}/api/notes/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate summary');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Summarize error:', error);
      throw error;
    }
  }
};

// Study sessions endpoint
export const studySessionsAPI = {
  create: async (courseId, sessionType, durationMinutes) => {
    try {
      //const response = await fetch(`${API_BASE_URL}/api/study-sessions`, {
      const response = await apiFetch(`${API_BASE_URL}/api/study-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId, sessionType, durationMinutes })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save study session');
      }
      
      const data = await response.json();
      return { 
        success: true, 
        sessionID: data.session?.sessionID,
        message: data.message
      };
    } catch (error) {
      console.error('Save study session error:', error);
      throw error;
    }
  },

  getWeeklyStats: async (courseId) => {
    try {
        const url = courseId 
            ? `${API_BASE_URL}/api/study-sessions/weekly-stats?courseId=${courseId}`
            : `${API_BASE_URL}/api/study-sessions/weekly-stats`;
      
      //const response = await fetch(url, {
      const response = await apiFetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch weekly stats');
      
      return await response.json();
    } catch (error) {
      console.error('Get weekly stats error:', error);
      return { hoursThisWeek: 0, weeklyGoal: 10, progress: 0, sessionsCount: 0 };
    }
  }
};

// Chat endpoint
export const chatAPI = {
  saveExchange: async (message, response, noteId) => {
    try {
      //await fetch(`${API_BASE_URL}/api/chat`, {
      await apiFetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, response, noteId: noteId || null })
      });
    } catch (err) {
      console.warn('[chatAPI] saveExchange failed:', err);
    }
  },

  getHistory: async (limit = 50, noteId = null) => {
    try {
      const params = new URLSearchParams({ limit });
      if (noteId) params.set('noteId', noteId);
      //const res = await fetch(`${API_BASE_URL}/api/chat/history?${params}`, {
      const res = await apiFetch(`${API_BASE_URL}/api/chat/history?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.history || [];
    } catch (err) {
      console.warn('[chatAPI] getHistory failed:', err);
      return [];
    }
  },

  clearHistory: async () => {
    try {
      //await fetch(`${API_BASE_URL}/api/chat/history`, {
      await apiFetch(`${API_BASE_URL}/api/chat/history`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('[chatAPI] clearHistory failed:', err);
    }
  }
};

// Notifications endpoint
export const notificationsAPI = {
  getAll: async () => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/notifications`, { credentials: 'include' });
      const res = await apiFetch(`${API_BASE_URL}/api/notifications`, { credentials: 'include' });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return await res.json();
    } catch (err) {
      console.warn('[notificationsAPI] getAll failed:', err);
      return { notifications: [], unreadCount: 0 };
    }
  },

  getUnreadCount: async () => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, { credentials: 'include' });
      const res = await apiFetch(`${API_BASE_URL}/api/notifications/unread-count`, { credentials: 'include' });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.unreadCount || 0;
    } catch {
      return 0;
    }
  },

  markRead: async (notificationId) => {
    try {
      //await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      await apiFetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('[notificationsAPI] markRead failed:', err);
    }
  },

  markAllRead: async () => {
    try {
      await apiFetch(`${API_BASE_URL}/api/notifications/read-all`, {
      //await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PUT',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('[notificationsAPI] markAllRead failed:', err);
    }
  }
};
// Schedule / Calendar events
export const scheduleAPI = {
  getAll: async () => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/schedule/events`, {
      const res = await apiFetch(`${API_BASE_URL}/api/schedule/events`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      return data.events || [];
    } catch (err) {
      console.warn('[scheduleAPI] getAll failed:', err);
      return [];
    }
  },

  create: async (event) => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/schedule/events`, {
      const res = await apiFetch(`${API_BASE_URL}/api/schedule/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(event)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create event');
      }
      return await res.json();
    } catch (err) {
      console.error('[scheduleAPI] create failed:', err);
      throw err;
    }
  },

  update: async (eventId, updates) => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/schedule/events/${eventId}`, {
      const res = await apiFetch(`${API_BASE_URL}/api/schedule/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update event');
      }
      return await res.json();
    } catch (err) {
      console.error('[scheduleAPI] update failed:', err);
      throw err;
    }
  },

  delete: async (eventId) => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/schedule/events/${eventId}`, {
      const res = await apiFetch(`${API_BASE_URL}/api/schedule/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete event');
      }
      return await res.json();
    } catch (err) {
      console.error('[scheduleAPI] delete failed:', err);
      throw err;
    }
  }
};

// Settings endpoints
export const settingsAPI = {
  getNotificationSettings: async () => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/settings/notifications`, {
      const res = await apiFetch(`${API_BASE_URL}/api/settings/notifications`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to load notification settings');
      }
      const data = await res.json();
      return data.notifications || {};
    } catch (err) {
      console.warn('[settingsAPI] getNotificationSettings failed:', err);
      throw err;
    }
  },

  updateNotificationSettings: async (notifications) => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/settings/notifications`, {
      const res = await apiFetch(`${API_BASE_URL}/api/settings/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notifications })
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update notification settings');
      }
      return await res.json();
    } catch (err) {
      console.warn('[settingsAPI] updateNotificationSettings failed:', err);
      throw err;
    }
  },

  getAbout: async () => {
    try {
      //const res = await fetch(`${API_BASE_URL}/api/settings/about`, {
      const res = await apiFetch(`${API_BASE_URL}/api/settings/about`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to load app info');
      }
      return await res.json();
    } catch (err) {
      console.warn('[settingsAPI] getAbout failed:', err);
      throw err;
    }
  }
};