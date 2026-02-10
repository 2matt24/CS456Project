import React from 'react';
import CourseCard from '../components/CourseCard';
import '../styles/Dashboard.css';

function Dashboard() {
  // Mock data for now - later this will come from your database
  const courses = [
    { id: 1, name: 'Data Structures', color: '#667eea', icon: '📚' },
    { id: 2, name: 'Web Development', color: '#f093fb', icon: '💻' },
    { id: 3, name: 'Algorithms', color: '#4facfe', icon: '🧮' },
    { id: 4, name: 'Database Systems', color: '#43e97b', icon: '🗄️' },
  ];

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
        <div className="courses-grid">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
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