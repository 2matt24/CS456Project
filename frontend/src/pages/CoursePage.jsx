import StudyTimer from '../components/StudyTimer.jsx';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { coursesAPI, notesAPI } from '../services/api';
import '../styles/CoursePage.css';

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourseData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [courses, courseNotes] = await Promise.all([
          coursesAPI.getAll(),
          notesAPI.getForCourse(Number(courseId)),
        ]);

        const selectedCourse = courses.find((item) => String(item.courseID) === String(courseId));

        if (!selectedCourse) {
          setError('Course not found.');
          return;
        }

        setCourse(selectedCourse);
        setNotes(courseNotes);
      } catch (loadError) {
        console.error('Course page load error:', loadError);
        setError('Failed to load course details.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  return (
    <div className="course-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate('/dashboard')}>←</div>
        <div className="nav-icons">
          <span className="icon">🔔</span>
          <span className="icon">👤</span>
        </div>
      </div>

      {isLoading && <p className="loading-text">Loading course...</p>}
      {error && <p className="error-text">{error}</p>}

      {course && !isLoading && (
        <>
          <div className="course-header">
            <h2 className="course-title">{course.courseName}</h2>
            <p className="course-info">
              {[course.semester, course.courseCode].filter(Boolean).join(' | ') || 'Course details'}
            </p>
          </div>

          <div className="course-images">
            <div className="image-placeholder">{course.icon || '📚'}</div>
            <div className="image-placeholder" style={{ background: course.color || '#667eea', color: '#fff' }}>
              {notes.length} Notes
            </div>
          </div>

          <div className="notes-section">
            {notes.length === 0 ? (
              <div className="note-card">
                <div className="note-details">
                  <h4>No notes yet</h4>
                  <p>Create your first note summary for this course.</p>
                </div>
              </div>
            ) : (
              notes.map((note) => (
                <button
                  key={note.noteID}
                  className="note-card note-card-button"
                  onClick={() => navigate(`/course/${courseId}/notes/${note.noteID}`)}
                >
                  <div className="note-icon">📝</div>
                  <div className="note-details">
                    <h4>{note.title}</h4>
                    <small>{new Date(note.createdAt).toLocaleString()}</small>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

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

      <StudyTimer />

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
