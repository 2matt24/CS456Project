import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoMdNotifications, IoMdAdd } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdArrowBack, MdBolt } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import { IoDocumentTextOutline, IoSearchSharp } from 'react-icons/io5';
import { coursesAPI, notesAPI } from '../services/api';
import StudyTimer from '../components/StudyTimer';
import AddModal from '../components/AddModal';
import '../styles/CoursePage.css';

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse]             = useState(null);
  const [notes, setNotes]               = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => { loadCourseData(); }, [courseId]);

  const loadCourseData = async () => {
    try {
      const allCourses = await coursesAPI.getAll();
      const currentCourse = allCourses.find(c => c.courseID === parseInt(courseId));
      setCourse(currentCourse);
      const courseNotes = await notesAPI.getForCourse(courseId);
      setNotes(courseNotes);
    } catch (error) {
      console.error('Failed to load course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const response = await fetch('https://cs456project.onrender.com/api/notes/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: searchQuery }),
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

  const clearSearch = () => { setSearchQuery(''); setSearchResults([]); };

  if (isLoading) {
    return (
      <div className="course-container">
        <div className="cp-loading">
          <div className="cp-spinner" />
          <p>Loading course…</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-container">
        <p className="error-text">Course not found.</p>
        <button className="cp-back-btn" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const displayNotes = searchResults.length > 0 ? null : notes;

  return (
    <div className="course-container">

      {/* ── Navbar ── */}
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

      {/* ── Course header ── */}
      <div className="course-header">
        <div className="course-icon-large" style={{ background: course.color }}>
          {course.icon}
        </div>
        <h2 className="course-title">{course.courseName}</h2>
        {course.courseCode && <p className="course-code">{course.courseCode}</p>}
        {course.semester    && <p className="course-info">{course.semester}</p>}
      </div>

      {/* ── Action buttons ── */}
      <div className="cp-actions">
        <button
          className="cp-add-note-btn"
          onClick={() => navigate(`/course/${courseId}/notes/new`)}
        >
          <IoMdAdd size={22} />
          Add Note
        </button>
        <button
          className="cp-quick-study-btn"
          onClick={() => navigate(`/course/${courseId}/quick-study`)}
        >
          <MdBolt size={20} />
          Quick Study
        </button>
      </div>

      {/* ── Search ── */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search notes by topic or keyword…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            className="search-btn"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            <IoSearchSharp size={18} />
            {isSearching ? 'Searching…' : 'Search'}
          </button>
          {searchQuery && (
            <button className="clear-btn" onClick={clearSearch}>✕</button>
          )}
        </div>
      </div>

      {/* ── Notes directory ── */}
      <div className="notes-section">
        <h3 className="section-title">
          <IoDocumentTextOutline size={20} />
          {searchResults.length > 0 ? `Search Results (${searchResults.length})` : `Notes (${notes.length})`}
        </h3>

        {/* Search results */}
        {searchResults.length > 0 && searchResults.map(result => {
          const note = notes.find(n => n.noteID === parseInt(result.noteId));
          return note ? (
            <div
              key={result.noteId}
              className="note-item search-result"
              onClick={() => navigate(`/course/${courseId}/note/${result.noteId}`)}
            >
              <div className="note-icon">
                <IoDocumentTextOutline size={28} color="#667eea" />
              </div>
              <div className="note-details">
                <h4>{result.title}</h4>
                <p className="note-date">Relevance: {(result.score * 100).toFixed(0)}%</p>
              </div>
            </div>
          ) : null;
        })}

        {/* Normal list */}
        {searchResults.length === 0 && notes.length === 0 && (
          <div className="empty-state">
            <IoDocumentTextOutline size={44} color="#d0d5e0" />
            <p>No notes yet.</p>
            <button
              className="empty-add-btn"
              onClick={() => navigate(`/course/${courseId}/notes/new`)}
            >
              Create your first note
            </button>
          </div>
        )}

        {searchResults.length === 0 && notes.map(note => (
          <div
            key={note.noteID}
            className="note-item"
            onClick={() => navigate(`/course/${courseId}/note/${note.noteID}`)}
          >
            <div className="note-icon">
              <IoDocumentTextOutline size={28} color="#667eea" />
            </div>
            <div className="note-details">
              <h4>{note.title}</h4>
              <p className="note-date">
                {new Date(note.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
              {note.fileName && (
                <p className="note-filename">📎 {note.fileName}</p>
              )}
            </div>
            <div className="note-arrow">›</div>
          </div>
        ))}
      </div>

      {/* ── Bottom navigation ── */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => setIsAddModalOpen(true)}>
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

      <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}

export default CoursePage;
