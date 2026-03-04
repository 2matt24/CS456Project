import StudyTimer from '../components/StudyTimer.jsx';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/CoursePage.css';

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [activeTab, setActiveTab] = useState('notes');

  const course = {
    name: 'Spring 25 | Tues/Thurs 11am - 12:30pm | JU STEAM 102',
    notes: [
      { id: 1, title: 'Lesson 6 Summary', image: '📝', rating: 4 },
      { id: 2, title: 'Lesson 6 Summary', image: '📝', rating: 5 },
    ]
  };

  return (
    <div className="course-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate('/dashboard')}>←</div>
        <div className="nav-icons">
          <span className="icon">🔔</span>
          <span className="icon">👤</span>
        </div>
      </div>

      {/* Course header */}
      <div className="course-header">
        <h2 className="course-title">Course Title</h2>
        <p className="course-info">{course.name}</p>
      </div>

      {/* Course images/materials */}
      <div className="course-images">
        <div className="image-placeholder">📸</div>
        <div className="image-placeholder">📸</div>
      </div>

      {/* Notes list */}
      <div className="notes-section">
        {course.notes.map(note => (
          <div key={note.id} className="note-card">
            <div className="note-icon">{note.image}</div>
            <div className="note-details">
              <h4>{note.title}</h4>
              <div className="rating">
                {'⭐'.repeat(note.rating)}
              </div>
            </div>
          </div>
        ))}
      </div>

     {/* Action buttons */}
      <div className="action-buttons">
        <button 
          className="btn-action btn-primary"
          onClick={() => navigate(`/course/${courseId}/notes/new`)}
        >
          📝 Notes Summary
        </button>
        <button className="btn-action btn-secondary">
          ⚡ Quick Study
        </button>
      </div>

      {/* Study Timer */}
      <StudyTimer />

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="nav-item">➕</div>
        <div className="nav-item">📅</div>
        <div className="nav-item active">🏠</div>
        <div className="nav-item">💬</div>
        <div className="nav-item">⚙️</div>
      </div>
    </div>
  );
}

export default CoursePage;