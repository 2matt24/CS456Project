import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdNotifications, IoMdPower } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdMenuBook } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import CourseCard from '../components/CourseCard';
import AddModal from '../components/AddModal';
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

const FALLBACK_QUOTES = [
  'Every expert was once a beginner.',
  'Small steps every day lead to big results.',
  'Consistency beats perfection every time.',
  'Knowledge is the best investment you can make.',
  'One note at a time, one concept at a time.',
];

function Dashboard() {
  const navigate = useNavigate();
  const [courses, setCourses]           = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState('');
  const [logoutMessage, setLogoutMessage] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firstName, setFirstName]       = useState('');
  const [unreadCount, setUnreadCount]   = useState(0);
  const [quote, setQuote]               = useState(
    () => FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
  );

  useEffect(() => {
    loadCourses();
    loadUser();
    notificationsAPI.getUnreadCount().then(setUnreadCount).catch(() => {});
    // Fetch a motivational quote from DummyJSON (free, no key, CORS-friendly)
    fetch('https://dummyjson.com/quotes/random')
      .then(r => r.json())
      .then(data => { if (data?.quote) setQuote(data.quote); })
      .catch(() => {}); // silently use fallback if offline
  }, []);

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
      setFirstName(data.user?.firstName || '');
    } catch (err) {
      console.error('Load user error:', err);
    }
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
              <span className="dash-icon" onClick={() => navigate('/profile')}>
                <FaUserCircle size={26} />
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
              <CourseCard
                key={course.courseID}
                course={course}
              />
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
    </>
  );
}

export default Dashboard;
