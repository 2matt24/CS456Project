import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import CourseCard from '../components/CourseCard';
import { coursesAPI, authAPI } from '../services/api';
import { HiMenuAlt2 } from 'react-icons/hi';
import { IoMdNotifications, IoMdPower } from 'react-icons/io';
import { FaUserCircle } from 'react-icons/fa';
import '../styles/Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadCourses();
    }, []);

   const [logoutMessage, setLogoutMessage] = useState('');

const handleLogout = async () => {
  try {
    await authAPI.logout();
    setLogoutMessage('Logging out...');
    
    setTimeout(() => {
      navigate('/');
    }, 1500); // Show message for 1.5 seconds then redirect
  } catch (error) {
    console.error('Logout error:', error);
    navigate('/');
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

    return (
         <>
            {logoutMessage && (
                <div className="logout-message">
                    {logoutMessage}
                </div>
            )}

        <div className="dashboard-container">
            {/* Top navigation bar */}
            <div className="navbar">
                <div className="nav-icons">
                    <span className="icon" onClick={() => navigate('/profile')}>
                        <FaUserCircle size={24} />
                    </span>
                    <span className="icon" onClick={() => navigate('/notifications')}>
                        <IoMdNotifications size={24} />
                    </span>
                </div>
                    <div>
                         <span className="icon logout-icon" onClick={handleLogout}>
                         <IoMdPower size={24} />
                        </span>
                    </div>
            </div>

            {/* Welcome message */}
            <h2 className="welcome-text">Welcome Back, April</h2>

            {/* Courses section */}
            <div className="section">
                <h3 className="section-title">Courses</h3>

                {isLoading && <p className="loading-text">Loading courses...</p>}
                {error && <p className="error-text">{error}</p>}

                <div className="courses-grid">
                    {courses.map(course => (
                        <CourseCard
                            key={course.courseID}
                            course={{
                                id: course.courseID,
                                name: course.courseName,
                                color: course.color,
                                icon: course.icon
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom navigation */}
            <div className="bottom-nav">
                <div className="nav-item active"> {/* onClick={() => navigate('/courses/new')}> */}
                    <IoMdAdd size={28} />
                </div>
                <div className="nav-item"> {/* onClick={() => navigate('/schedule')}> */}
                    <MdCalendarToday size={24} />
                </div>
                <div className="nav-item"> {/* onClick={() => navigate('/dashboard')}> */}
                    <MdHome size={26} />
                </div>
                <div className="nav-item"> {/* onClick={() => navigate('/chat')}> */}
                    <MdChat size={24} />
                </div>
                <div className="nav-item"> {/* onClick={() => navigate('/settings') }> */}
                    <MdSettings size={26} />
                </div>
            </div>
        </div>
          </>
    );
}

export default Dashboard;