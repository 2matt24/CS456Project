﻿const API_BASE_URL = 'https://cs456project.onrender.com';

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

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    },

    login: async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
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

export const coursesAPI = {
    getAll: async () => {
        try {

            const response = await fetch(`${API_BASE_URL}/api/courses`, {
              credentials: 'include'
            });
            return await response.json();

            return [
                { courseID: 1, courseName: 'Data Structures', courseCode: 'CS201', color: '#667eea', icon: '📚' },
                { courseID: 2, courseName: 'Web Development', courseCode: 'CS456', color: '#f093fb', icon: '💻' },
                { courseID: 3, courseName: 'Algorithms', courseCode: 'CS301', color: '#4facfe', icon: '🧮' },
                { courseID: 4, courseName: 'Database Systems', courseCode: 'CS402', color: '#43e97b', icon: '🗄️' },
            ];
        } catch (error) {
            console.error('Get courses error:', error);
            throw error;
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
            return await response.json();

            console.log('Creating course (mock):', { courseName, courseCode, semester, color, icon });
            return { success: true, courseID: Date.now() };
        } catch (error) {
            console.error('Create course error:', error);
            throw error;
        }
    }
};

// Notes endpoints (mock for now)
export const notesAPI = {
    getForCourse: async (courseId) => {
        try {
            // Mock data
            return [
                { noteID: 1, title: 'Lesson 6 Summary', content: 'Arrays and data structures...', createdAt: new Date() },
                { noteID: 2, title: 'Lesson 7 Summary', content: 'Linked lists overview...', createdAt: new Date() },
            ];
        } catch (error) {
            console.error('Get notes error:', error);
            throw error;
        }
    },

    create: async (courseId, title, content) => {
        try {
            // const response = await fetch(`${API_BASE_URL}/api/notes`, {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   credentials: 'include',
            //   body: JSON.stringify({ courseId, title, content })
            // });
            // return await response.json();

            // Mock for now
            console.log('Creating note (mock):', { courseId, title, content });
            return { success: true, noteID: Date.now() };
        } catch (error) {
            console.error('Create note error:', error);
            throw error;
        }
    },

    summarize: async (noteContent) => {
        try {
            // Mock AI summary for now
            return {
                summary: "This is a placeholder AI-generated summary. Real AI integration will be added in Milestone 3 using OpenAI API."
            };
        } catch (error) {
            console.error('Summarize error:', error);
            throw error;
        }
    }
};

// Study sessions endpoint (mock for now)
export const studySessionsAPI = {
    create: async (courseId, sessionType, durationMinutes) => {
        try {
            // Mock for now
            console.log('Saving study session (mock):', { courseId, sessionType, durationMinutes });
            return { success: true, sessionID: Date.now() };
        } catch (error) {
            console.error('Save study session error:', error);
            throw error;
        }
    }
};