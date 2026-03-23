import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdNotifications, IoMdPower } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import CourseCard from '../components/CourseCard';
import AddModal from '../components/AddModal';
import { coursesAPI, authAPI } from '../services/api';
import '../styles/Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoutMessage, setLogoutMessage] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const session = await authAPI.getSession();
      if (!session.authenticated) {
        navigate('/');
        return;
      }
      setSessionUser(session.user || null);
      await loadCourses();
    };
    init();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setLogoutMessage('Logging out...');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const loadCourses = async () => {
    try {
      const data = await coursesAPI.getAll();
      setCourses(data);
      setError('');
    } catch (err) {
      setError('Failed to load courses');
      console.error('Load courses error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {logoutMessage && <div className="logout-message">{logoutMessage}</div>}
      <div className="dashboard-container">
        <div className="navbar">
          <div className="nav-icons">
            <span className="icon" onClick={() => navigate('/profile')}><FaUserCircle size={24} /></span>
            <span className="icon" onClick={() => navigate('/notifications')}><IoMdNotifications size={24} /></span>
          </div>
          <div><span className="icon logout-icon" onClick={handleLogout}><IoMdPower size={24} /></span></div>
        </div>

        <h2 className="welcome-text">Welcome Back{sessionUser?.firstName ? `, ${sessionUser.firstName}` : ''}</h2>

        <div className="section">
          <h3 className="section-title">Courses</h3>
          {isLoading && <p className="loading-text">Loading courses...</p>}
          {error && <p className="error-text">{error}</p>}
          <div className="courses-grid">
            {courses.map((course) => (
              <CourseCard key={course.courseID} course={{ id: course.courseID, name: course.courseName, code: course.courseCode, color: course.color, icon: course.icon }} />
            ))}
          </div>
        </div>

        <div className="bottom-nav">
          <div className="nav-item" onClick={() => setIsAddModalOpen(true)}><IoMdAdd size={28} /></div>
          <div className="nav-item" onClick={() => navigate('/calendar')}><MdCalendarToday size={24} /></div>
          <div className="nav-item active" onClick={() => navigate('/dashboard')}><MdHome size={26} /></div>
          <div className="nav-item" onClick={() => navigate('/chat')}><MdChat size={24} /></div>
          <div className="nav-item" onClick={() => navigate('/settings')}><MdSettings size={26} /></div>
        </div>
      </div>

      <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}

export default Dashboard;
