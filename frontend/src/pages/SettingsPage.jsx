import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdNotifications } from 'react-icons/io';
import { MdArrowBack } from 'react-icons/md';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdPerson, MdLock, MdColorLens, MdInfo } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import AddModal from '../components/AddModal';
import '../styles/PlaceholderPage.css';

const API_BASE = 'https://cs456project.onrender.com';

function getInitials(firstName, lastName) {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName  || '').trim()[0] || '';
  return (f + l).toUpperCase() || '?';
}

/* ─── Toggle switch component ─── */
function Toggle({ checked, onChange, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

/* ────────────────────────────────────────
   Main component
──────────────────────────────────────── */
export default function SettingsPage() {
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  return (
    <div className="settings-container">

      {/* ── Navbar ── */}
      <div className="settings-navbar">
        <button className="settings-nav-btn" onClick={() => navigate('/dashboard')}>
          <MdArrowBack size={26} />
        </button>
        <h3>Settings</h3>
        <div style={{ width: 38 }} />
      </div>

      {/* ── Profile summary card ── */}
      <div className="settings-profile-card">
        <div className="settings-avatar">
          {(user?.firstName || user?.lastName) ? (
            <span className="settings-initials">
              {getInitials(user.firstName, user.lastName)}
            </span>
          ) : (
            <MdPerson size={36} color="rgba(255,255,255,0.85)" />
          )}
        </div>
        <div className="settings-profile-info">
          <p className="settings-profile-name">
            {isLoadingUser ? 'Loading…' : fullName}
          </p>
          <p className="settings-profile-email">
            {isLoadingUser ? '' : (user?.email || 'No email')}
          </p>
        </div>
        <button
          className="settings-profile-edit-btn"
          onClick={() => navigate('/profile')}
        >
          Edit
        </button>
      </div>

      <div className="settings-body">

        {/* ════ ACCOUNT ════ */}
        <div className="settings-card">
          <h4 className="settings-card-title">
            <MdPerson size={18} /> Account Settings
          </h4>

          <button className="settings-action-row" onClick={() => navigate('/profile')}>
            <div className="settings-action-icon purple">
              <MdPerson size={20} color="white" />
            </div>
            <div className="settings-action-text">
              <span className="settings-action-label">Edit Profile</span>
              <span className="settings-action-sub">Update your name, email & bio</span>
            </div>
            <MdChevronRight size={22} color="#b0b8c4" />
          </button>

          <button className="settings-action-row" onClick={() => navigate('/profile')}>
            <div className="settings-action-icon indigo">
              <MdLock size={20} color="white" />
            </div>
            <div className="settings-action-text">
              <span className="settings-action-label">Change Password</span>
              <span className="settings-action-sub">Update your account password</span>
            </div>
            <MdChevronRight size={22} color="#b0b8c4" />
          </button>
        </div>

        {/* ════ NOTIFICATIONS ════ */}
        <div className="settings-card">
          <h4 className="settings-card-title">
            <MdNotifications size={18} /> Notifications
          </h4>

          <div className="settings-toggle-row">
            <div className="settings-toggle-icon green">
              <MdNotifications size={18} color="white" />
            </div>
            <div className="settings-toggle-text">
              <span className="settings-action-label">Study Reminders</span>
              <span className="settings-action-sub">Daily study session reminders</span>
            </div>
            <Toggle
              id="studyReminders"
              checked={notifs.studyReminders}
              onChange={(v) => setNotifs((n) => ({ ...n, studyReminders: v }))}
            />
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-icon teal">
              <MdStar size={18} color="white" />
            </div>
            <div className="settings-toggle-text">
              <span className="settings-action-label">Note Summaries</span>
              <span className="settings-action-sub">Get AI summaries when notes are added</span>
            </div>
            <Toggle
              id="noteSummaries"
              checked={notifs.noteSummaries}
              onChange={(v) => setNotifs((n) => ({ ...n, noteSummaries: v }))}
            />
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-icon orange">
              <MdCalendarToday size={18} color="white" />
            </div>
            <div className="settings-toggle-text">
              <span className="settings-action-label">Weekly Report</span>
              <span className="settings-action-sub">Progress summary every Sunday</span>
            </div>
            <Toggle
              id="weeklyReport"
              checked={notifs.weeklyReport}
              onChange={(v) => setNotifs((n) => ({ ...n, weeklyReport: v }))}
            />
          </div>

          <p className="settings-coming-soon-note">
            * Notification delivery coming in the next release
          </p>
        </div>

        {/* ════ APPEARANCE ════ */}
        <div className="settings-card">
          <h4 className="settings-card-title">
            <MdColorLens size={18} /> Appearance
          </h4>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => setIsAddModalOpen(true)}>
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

        {/* ════ ABOUT ════ */}
        <div className="settings-card">
          <h4 className="settings-card-title">
            <MdInfo size={18} /> About
          </h4>

          <div className="about-row">
            <span className="about-label">App Name</span>
            <span className="about-value">StudyBuddyAI</span>
          </div>
          <div className="about-row">
            <span className="about-label">Version</span>
            <span className="about-value">1.0.0</span>
          </div>
          <div className="about-row">
            <span className="about-label">AI Model</span>
            <span className="about-value">Gemini 2.5 Flash</span>
          </div>
          <div className="about-row">
            <span className="about-label">Built with</span>
            <span className="about-value">React + Flask</span>
          </div>
          <div className="about-row" style={{ borderBottom: 'none' }}>
            <span className="about-label">Contact</span>
            <span className="about-value">support@studybuddyai.app</span>
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>

      {/* ── Bottom Nav ── */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/dashboard')}><IoMdAdd size={28} /></div>
        <div className="nav-item" onClick={() => navigate('/calendar')}><MdCalendarToday size={24} /></div>
        <div className="nav-item" onClick={() => navigate('/dashboard')}><MdHome size={26} /></div>
        <div className="nav-item" onClick={() => navigate('/chat')}><MdChat size={24} /></div>
        <div className="nav-item active"><MdSettings size={26} /></div>
      </div>
    </div>

    <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
  );
}
