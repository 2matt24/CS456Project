import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoMdAdd, IoMdNotifications } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdPerson, MdLock, MdColorLens, MdInfo } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import '../styles/PlaceholderPage.css';

function SettingsPage() {
  const navigate = useNavigate();
  
  return (
    <div className="placeholder-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate('/dashboard')}>
          <IoArrowBack size={28} />
        </div>
        <h3>Settings</h3>
        <div style={{ width: '28px' }}></div>
      </div>

      <div className="placeholder-content">
        <div className="profile-section">
          <div className="profile-avatar">
            <FaUserCircle size={80} color="#667eea" />
          </div>
          <h3>April Smith</h3>
          <p className="profile-email">april@example.com</p>
        </div>

        <div className="settings-list">
          <div className="settings-item">
            <div className="settings-item-icon">
              <MdPerson size={24} color="#667eea" />
            </div>
            <div className="settings-item-content">
              <h4>Account Settings</h4>
              <p>Edit profile, change password</p>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-icon">
              <IoMdNotifications size={24} color="#43e97b" />
            </div>
            <div className="settings-item-content">
              <h4>Notifications</h4>
              <p>Manage notification preferences</p>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-icon">
              <MdColorLens size={24} color="#f093fb" />
            </div>
            <div className="settings-item-content">
              <h4>Appearance</h4>
              <p>Theme, colors, display settings</p>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-icon">
              <MdLock size={24} color="#ff6b6b" />
            </div>
            <div className="settings-item-content">
              <h4>Privacy & Security</h4>
              <p>Data, permissions, security</p>
            </div>
          </div>

          <div className="settings-item">
            <div className="settings-item-icon">
              <MdInfo size={24} color="#feca57" />
            </div>
            <div className="settings-item-content">
              <h4>About</h4>
              <p>Version 1.0.0 - StudyBuddy AI</p>
            </div>
          </div>
        </div>

        <div className="coming-soon-badge">Full Settings Coming Soon</div>
      </div>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/dashboard')}>
          <IoMdAdd size={28} />
        </div>
        <div className="nav-item" onClick={() => navigate('/calendar')}>
          <MdCalendarToday size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/dashboard')}>
          <MdHome size={26} />
        </div>
        <div className="nav-item" onClick={() => navigate('/chat')}>
          <MdChat size={24} />
        </div>
        <div className="nav-item active">
          <MdSettings size={26} />
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;