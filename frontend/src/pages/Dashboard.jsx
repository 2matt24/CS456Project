import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdNotifications, IoMdPower } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdMenuBook, MdEdit, MdDelete, MdPlayArrow } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import CourseCard from '../components/CourseCard';
import AddModal from '../components/AddModal';
import OnboardingModal from '../components/OnboardingModal';
import { coursesAPI, authAPI, notificationsAPI } from '../services/api';
import '../styles/Dashboard.css';

/* ── Helpers ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

const QUOTE_CACHE_KEY  = 'dashboard_quote';
const QUOTE_CACHE_TIME = 'quote_timestamp';
const CACHE_DURATION   = 60 * 60 * 1000; // 1 hour

async function fetchAIQuote() {
  const r = await fetch('https://cs456project.onrender.com/api/dashboard/quote', {
    credentials: 'include',
  });
  const data = await r.json();
  return data?.quote || 'Every expert was once a beginner.';
}

function Dashboard() {
  const navigate = useNavigate();
  const [courses, setCourses]           = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState('');
  const [logoutMessage, setLogoutMessage] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firstName, setFirstName]       = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [quote, setQuote]               = useState('Loading inspiration…');
  const [isRefreshingQuote, setIsRefreshingQuote] = useState(false);

  useEffect(() => {
    loadCourses();
    loadUser();
    notificationsAPI.getUnreadCount().then(setUnreadCount).catch(() => {});

    // Load quote — serve from 1-hour localStorage cache, refresh via AI otherwise
    const cachedQuote = localStorage.getItem(QUOTE_CACHE_KEY);
    const cacheTime   = localStorage.getItem(QUOTE_CACHE_TIME);
    const isCacheValid = cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION;

    if (isCacheValid && cachedQuote) {
      setQuote(cachedQuote);
    } else {
      fetchAIQuote()
        .then(q => {
          setQuote(q);
          localStorage.setItem(QUOTE_CACHE_KEY, q);
          localStorage.setItem(QUOTE_CACHE_TIME, Date.now().toString());
        })
        .catch(() => setQuote('Every expert was once a beginner.'));
    }
  }, []);

  const refreshQuote = async () => {
    setIsRefreshingQuote(true);
    try {
      const q = await fetchAIQuote();
      setQuote(q);
      localStorage.setItem(QUOTE_CACHE_KEY, q);
      localStorage.setItem(QUOTE_CACHE_TIME, Date.now().toString());
    } catch {
      // keep existing quote
    } finally {
      setIsRefreshingQuote(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setLogoutMessage('Logging out…');
      setTimeout(() => navigate('/'), 1500);
    } catch {
      navigate('/');
    }
  };

  const loadUser = async () => {
    try {
      const data = await authAPI.getMe();
      const u = data.user || {};
      setFirstName(u.firstName || '');
      setProfilePicture(u.profilePicture || null);
      if (!u.onboardingCompleted) setShowOnboarding(true);
    } catch (err) {
      console.error('Load user error:', err);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    loadUser();
    loadCourses();
  };

  const loadCourses = async () => {
    try {
      const data = await coursesAPI.getAll();
      setCourses(data);
    } catch (err) {
      setError('Failed to load courses');
      console.error('Load courses error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCourse = (e, courseId) => {
    e.stopPropagation();
    navigate(`/courses/${courseId}/edit`);
  };

  const handleDeleteCourse = async (e, courseId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this course and all of its notes/sessions? This cannot be undone.')) return;
    try {
      await coursesAPI.delete(courseId);
      setCourses(prev => prev.filter(c => c.courseID !== courseId));
    } catch {
      alert('Failed to delete course. Please try again.');
    }
  };

  const activeCourses = courses.filter(c => {
    if (!c.endDate) return true;
    return new Date(c.endDate) >= new Date();
  });

  return (
    <>
      {logoutMessage && (
        <div className="logout-message">{logoutMessage}</div>
      )}

      <div className="dashboard-container">

        {/* ── Hero Section ── */}
        <div className="dash-hero">
          <div className="dash-hero-top">
            <div className="dash-hero-icons">
              <span className="dash-icon notif-icon-wrap" onClick={() => navigate('/notifications')}>
                <IoMdNotifications size={26} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </span>
              <span className="dash-icon dash-avatar-icon" onClick={() => navigate('/profile')}>
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="dash-avatar-img" />
                ) : (
                  <FaUserCircle size={26} />
                )}
              </span>
            </div>
            <span className="dash-icon dash-logout" onClick={handleLogout}>
              <IoMdPower size={24} />
            </span>
          </div>

          <div className="dash-hero-body">
            <p className="dash-greeting">{getGreeting()}</p>
            <h1 className="dash-hero-name">{firstName || 'Student'} 👋</h1>
            <p className="dash-hero-date">{formatDate()}</p>
          </div>

          <div className="dash-hero-stats">
            <div className="dash-stat-pill">
              <span className="dash-stat-num">{courses.length}</span>
              <span className="dash-stat-lbl">Courses</span>
            </div>
            <div className="dash-stat-pill">
              <span className="dash-stat-num">{activeCourses.length}</span>
              <span className="dash-stat-lbl">Active</span>
            </div>
            <div className="dash-stat-pill dash-stat-pill-wide">
              <MdMenuBook size={14} style={{ opacity: 0.8 }} />
              <span className="dash-stat-quote">{quote}</span>
              <button
                className="quote-refresh-btn"
                onClick={refreshQuote}
                disabled={isRefreshingQuote}
                title="Get a new quote"
              >
                {isRefreshingQuote ? '⏳' : '🔄'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Courses Section ── */}
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">My Courses</h3>
            <button className="dash-add-btn" onClick={() => navigate('/courses/new')}>
              <IoMdAdd size={18} /> Add Course
            </button>
          </div>

          {isLoading && (
            <div className="dash-empty-state">
              <div className="dash-loading-dots">
                <span /><span /><span />
              </div>
              <p>Loading your courses…</p>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          {!isLoading && courses.length === 0 && !error && (
            <div className="dash-empty-state">
              <span className="dash-empty-icon">📚</span>
              <p className="dash-empty-title">No courses yet</p>
              <p className="dash-empty-sub">Add your first course to get started!</p>
              <button className="dash-empty-btn" onClick={() => navigate('/courses/new')}>
                <IoMdAdd size={16} /> Add Course
              </button>
            </div>
          )}

          <div className="courses-grid">
            {courses.map(course => (
              <div key={course.courseID} className="dash-course-wrap">
                <CourseCard course={course} />
                <div className="dash-course-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="dash-course-action-btn edit"
                    onClick={e => handleEditCourse(e, course.courseID)}
                    title="Edit course"
                  >
                    <MdEdit size={14} />
                  </button>
                  <button
                    className="dash-course-action-btn study"
                    onClick={e => { e.stopPropagation(); navigate(`/course/${course.courseID}/quick-study`); }}
                    title="Quick study"
                  >
                    <MdPlayArrow size={14} />
                  </button>
                  <button
                    className="dash-course-action-btn delete"
                    onClick={e => handleDeleteCourse(e, course.courseID)}
                    title="Delete course"
                  >
                    <MdDelete size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom Navigation ── */}
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
      </div>

      <AddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {showOnboarding && (
        <OnboardingModal
          firstName={firstName}
          onComplete={handleOnboardingComplete}
        />
      )}
    </>
  );
}

export default Dashboard;
