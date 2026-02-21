import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { coursesAPI } from '../services/api';
import '../styles/Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadCourses();
    }, []);

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
        <div className="dashboard-container">
            {/* Top navigation bar */}
            <div className="navbar">
                <div className="menu-icon">☰</div>
                <div className="nav-icons">
                    <span className="icon">🔔</span>
                    <span className="icon">👤</span>
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
                <div className="nav-item active">➕</div>
                <div className="nav-item">📅</div>
                <div className="nav-item">🏠</div>
                <div className="nav-item">💬</div>
                <div className="nav-item">⚙️</div>
            </div>
        </div>
    );
}

export default Dashboard;