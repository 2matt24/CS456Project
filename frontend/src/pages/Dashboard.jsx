import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdNotifications, IoMdPower } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import CourseCard from '../components/CourseCard';
import AddModal from '../components/AddModal';
import { coursesAPI, notesAPI, authAPI } from '../services/api';
import '../styles/Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [noteCounts, setNoteCounts] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [logoutMessage, setLogoutMessage] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [welcomeName, setWelcomeName] = useState('there');

    useEffect(() => {
        loadDashboard();
        loadWelcomeName();
    }, []);

    const loadWelcomeName = () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('studybuddy_user') || '{}');
            const fullName = [storedUser.firstName, storedUser.lastName].filter(Boolean).join(' ').trim();

            if (fullName) {
                setWelcomeName(fullName);
                return;
            }

            if (storedUser.email) {
                setWelcomeName(storedUser.email.split('@')[0]);
            }
        } catch (parseError) {
            console.error('Failed to load saved user profile:', parseError);
        }
    };

    const handleLogout = async () => {
        try {
            await authAPI.logout();
            localStorage.removeItem('studybuddy_user');
            setLogoutMessage('Logging out...');

            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (error) {
            console.error('Logout error:', error);
            navigate('/');
        }
    };

    const loadDashboard = async () => {
        try {
            const [courseData, noteData] = await Promise.all([
                coursesAPI.getAll(),
                notesAPI.getAll(),
            ]);

            const counts = noteData.reduce((acc, note) => {
                const key = String(note.courseID);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});

            setCourses(courseData);
            setNoteCounts(counts);
        } catch (err) {
            setError('Failed to load dashboard data');
            console.error('Load dashboard error:', err);
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
                <h2 className="welcome-text">Welcome Back, {welcomeName}</h2>

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
                                    code: course.courseCode,
                                    color: course.color,
                                    icon: course.icon,
                                    noteCount: noteCounts[String(course.courseID)] || 0,
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Bottom navigation */}
                <div className="bottom-nav">
                    <div className="nav-item active" onClick={() => setIsAddModalOpen(true)}>
                        <IoMdAdd size={28} />
                    </div>
                    <div className="nav-item">
                        <MdCalendarToday size={24} />
                    </div>
                    <div className="nav-item">
                        <MdHome size={26} />
                    </div>
                    <div className="nav-item">
                        <MdChat size={24} />
                    </div>
                    <div className="nav-item">
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
