import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoMdAdd } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import '../styles/PlaceholderPage.css';

function CalendarPage() {
  const navigate = useNavigate();
  
  return (
    <div className="placeholder-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate('/dashboard')}>
          <IoArrowBack size={28} />
        </div>
        <h3>Calendar</h3>
        <div style={{ width: '28px' }}></div>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-icon">
          <MdCalendarToday size={80} color="#667eea" />
        </div>
        <h2>Calendar</h2>
        <p>Track your study schedule, assignments, and deadlines all in one place.</p>
        <div className="coming-soon-badge">Coming Soon</div>
      </div>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/dashboard')}>
          <IoMdAdd size={28} />
        </div>
        <div className="nav-item active">
          <MdCalendarToday size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/dashboard')}>
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

export default CalendarPage;