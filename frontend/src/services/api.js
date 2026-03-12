const API_BASE_URL = 'https://cs456project.onrender.com';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseResponse(response, defaultMessage) {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || defaultMessage;
    throw new ApiError(message, response.status);
  }

  return data;
}


// Auth endpoints
export const authAPI = {
  register: async (email, password, firstName, lastName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, firstName, lastName })
      });

      if (!response.ok) throw new Error('Registration failed');
      return await response.json();
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    return parseResponse(response, 'Login failed');
  },

  logout: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
};

// Courses endpoints
export const coursesAPI = {
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      // Backend returns {"courses": [...]} 
      return data.courses || data || [];
    } catch (error) {
      console.error('Get courses error:', error);
      return [];
    }
  },

  create: async (courseName, courseCode, semester, color, icon) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseName, courseCode, semester, color, icon })
      });

      if (!response.ok) throw new Error('Failed to create course');

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
  }
};

// Notes endpoints
export const notesAPI = {

  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch notes');

      const data = await response.json();
      return data.notes || [];
    } catch (error) {
      console.error('Get all notes error:', error);
      return [];
    }
  },

  getForCourse: async (courseId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes?courseId=${courseId}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch notes');

      const data = await response.json();
      // Backend returns {notes: [...]}
      return data.notes || [];
    } catch (error) {
      console.error('Get notes error:', error);
      return [];
    }
  },

  create: async (courseId, title, content) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId, title, content })
      });

      if (!response.ok) throw new Error('Failed to create note');

      const data = await response.json();
      return {
        success: true,
        noteID: data.note?.noteID,
        message: data.message,
        note: data.note
      };
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  },

  update: async (noteId, courseId, title, content) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId, title, content })
      });

      if (!response.ok) throw new Error('Failed to update note');

      const data = await response.json();
      return {
        success: true,
        message: data.message,
        note: data.note
      };
    } catch (error) {
      console.error('Update note error:', error);
      throw error;
    }
  },

  summarize: async (content) => {
    const response = await fetch(`${API_BASE_URL}/api/notes/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content })
    });

    return parseResponse(response, 'Failed to generate summary');
  }
};

// Study sessions endpoint
export const studySessionsAPI = {
  create: async (courseId, sessionType, durationMinutes) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId, sessionType, durationMinutes })
      });

      if (!response.ok) throw new Error('Failed to save study session');

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
  }
};
