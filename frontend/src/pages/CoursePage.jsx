import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack, IoMdNotifications, IoMdAdd, IoMdCamera, IoMdCreate } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import { FaUserCircle, FaFileUpload, FaStar } from 'react-icons/fa';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { coursesAPI, notesAPI } from '../services/api';
import StudyTimer from '../components/StudyTimer';
import '../styles/CoursePage.css';

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      // Get all courses and find this one
      const allCourses = await coursesAPI.getAll();
      const currentCourse = allCourses.find(c => c.courseID === parseInt(courseId));
      setCourse(currentCourse);

      // Get notes for this course
      const courseNotes = await notesAPI.getForCourse(courseId);
      setNotes(courseNotes);
    } catch (error) {
      console.error('Failed to load course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="course-container">
        <div className="loading-text">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-container">
        <div className="error-text">Course not found</div>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="course-container">
      {/* Top navigation */}
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate('/dashboard')}>
          <IoArrowBack size={28} />
        </div>
        <div className="nav-icons">
          <span className="icon" onClick={() => navigate('/notifications')}>
            <IoMdNotifications size={24} />
          </span>
          <span className="icon" onClick={() => navigate('/profile')}>
            <FaUserCircle size={24} />
          </span>
        </div>
      </div>

      {/* Course header */}
      <div className="course-header">
        <div className="course-icon-large" style={{ background: course.color }}>
          {course.icon}
        </div>
        <h2 className="course-title">{course.courseName}</h2>
        <p className="course-code">{course.courseCode}</p>
        <p className="course-info">{course.semester}</p>
      </div>

      {/* Upload Options */}
      <div className="upload-options">
        <div 
          className="upload-option"
          onClick={() => navigate(`/course/${courseId}/notes/scan`)}
        >
          <IoMdCamera size={40} color="#667eea" />
          <span>Scan Notes</span>
        </div>
        
        <div 
          className="upload-option"
          onClick={() => navigate(`/course/${courseId}/notes/upload`)}
        >
          <FaFileUpload size={36} color="#43e97b" />
          <span>Upload File</span>
        </div>
        
        <div 
          className="upload-option"
          onClick={() => navigate(`/course/${courseId}/notes/new`)}
        >
          <IoMdCreate size={40} color="#764ba2" />
          <span>Type Manually</span>
        </div>
      </div>

      {/* Notes Directory */}
      <div className="notes-section">
        <h3 className="section-title">
          <IoDocumentTextOutline size={22} /> Notes Directory
        </h3>
        
        {notes.length === 0 ? (
          <div className="empty-state">
            <p>No notes yet. Create your first note above!</p>
          </div>
        ) : (
          notes.map(note => (
            <div 
              key={note.noteID} 
              className="note-item"
              onClick={() => navigate(`/course/${courseId}/note/${note.noteID}`)}
            >
              <div className="note-icon">
                <IoDocumentTextOutline size={30} color="#667eea" />
              </div>
              <div className="note-details">
                <h4>{note.title}</h4>
                <p className="note-date">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
                {note.fileName && (
                  <p className="note-filename">📎 {note.fileName}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Study Button */}
      <div className="action-buttons">
        <button 
          className="btn-action btn-primary"
          onClick={() => navigate(`/course/${courseId}/quick-study`)}
        >
          ⚡ Quick Study
        </button>
      </div>

      {/* Study Timer */}
      <StudyTimer />

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/dashboard')}>
          <IoMdAdd size={28} />
        </div>
        <div className="nav-item" onClick={() => navigate('/calendar')}>
          <MdCalendarToday size={24} />
        </div>
        <div className="nav-item active" onClick={() => navigate('/dashboard')}>
          <MdHome size={26} />
        </div>
        <div className="nav-item" onClick={() => navigate('/chat')}>
          <MdChat size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/settings')}>
          <MdSettings size={26} />
        </div>
      </div>
    </div>
  );
}

export default CoursePage;