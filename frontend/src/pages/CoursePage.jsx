import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoMdNotifications, IoMdAdd, IoMdCamera, IoMdCreate } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdArrowBack } from 'react-icons/md';
import { FaUserCircle, FaFileUpload, FaStar } from 'react-icons/fa';
import { IoDocumentTextOutline, IoSearchSharp } from 'react-icons/io5';
import { coursesAPI, notesAPI } from '../services/api';
import StudyTimer from '../components/StudyTimer';
import '../styles/CoursePage.css';

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('https://cs456project.onrender.com/api/notes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: searchQuery })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
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
          <MdArrowBack size={28} />
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

      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search notes by topic or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            className="search-btn" 
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            <IoSearchSharp size={20} />
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchQuery && (
            <button className="clear-btn" onClick={clearSearch}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Notes Directory */}
      <div className="notes-section">
        <h3 className="section-title">
          <IoDocumentTextOutline size={22} />
          {searchResults.length > 0 ? 'Search Results' : 'Notes Directory'}
        </h3>

        {searchResults.length > 0 ? (
          searchResults.map(result => {
            const note = notes.find(n => n.noteID === parseInt(result.noteId));
            return note ? (
              <div
                key={result.noteId}
                className="note-item search-result"
                onClick={() => navigate(`/course/${courseId}/note/${result.noteId}`)}
              >
                <div className="note-icon">
                  <IoDocumentTextOutline size={30} color="#667eea" />
                </div>
                <div className="note-details">
                  <h4>{result.title}</h4>
                  <p className="note-date">
                    Relevance: {(result.score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            ) : null;
          })
        ) : notes.length === 0 ? (
          // Show empty state if no notes exist
          <div className="empty-state">
            <p>No notes yet. Create your first note above!</p>
          </div>
        ) : (
          // Show all notes normally
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