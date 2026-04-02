import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CoursePage from './pages/CoursePage';
import NotesPage from './pages/NotesPage';
import AddCoursePage from './pages/AddCoursePage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import CalendarPage from './pages/CalendarPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import NoteViewPage from './pages/NoteViewPage';
import QuickStudyPage from './pages/QuickStudyPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import UploadSchedulePage from './pages/UploadSchedulePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses/new" element={<AddCoursePage />} />
        <Route path="/courses/:courseId/edit" element={<AddCoursePage />} />
        <Route path="/course/:courseId" element={<CoursePage />} />
        <Route path="/course/:courseId/notes/new" element={<NotesPage />} />
        <Route path="/course/:courseId/note/:noteId" element={<NoteViewPage />} />
        <Route path="/course/:courseId/quick-study" element={<QuickStudyPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} /> 
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/schedule/upload" element={<UploadSchedulePage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;