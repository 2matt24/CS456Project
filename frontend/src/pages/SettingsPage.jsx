
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd } from 'react-icons/io';
import { MdArrowBack, MdChevronRight } from 'react-icons/md';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdPerson, MdLock, MdColorLens, MdInfo } from 'react-icons/md';
import { MdNotifications, MdStar, MdTextFields, MdPalette, MdBrightness4, MdBrightness7, MdBrightnessAuto } from 'react-icons/md';
import AddModal from '../components/AddModal';
import { authAPI, settingsAPI } from '../services/api';
import { useTheme, ACCENTS } from '../context/ThemeContext';
import '../styles/SettingsPage.css';

//const API_BASE = 'https://cs456project.onrender.com';

function getInitials(firstName, lastName) {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName  || '').trim()[0] || '';
  return (f + l).toUpperCase() || '?';
}

/* ─── Toggle switch component ─── */
function Toggle({ checked, onChange, id, disabled = false }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
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
  const { themePref, accent, fontSize, updateTheme, updateAccent, updateFontSize } = useTheme();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [user, setUser] = useState(null);
  const [about, setAbout] = useState({
    appName: 'StudyBuddyAI',
    version: '1.0.0',
    aiModel: 'Gemini 2.5 Flash',
    techStack: 'React + Flask',
    contact: 'support@studybuddyai.app'
  });
  const [notifs, setNotifs] = useState({
    studyReminders: true,
    noteSummaries: true,
    weeklyReport: false,
  });
  
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

  useEffect(() => {
    const loadSettingsPageData = async () => {
      try {
        const [userData, notificationSettings, aboutData] = await Promise.all([
          authAPI.getMe(),
          settingsAPI.getNotificationSettings(),
          settingsAPI.getAbout(),
        ]);

        setUser(userData.user || null);
        setNotifs(notificationSettings);
        setAbout(aboutData);
      } catch (err) {
        console.warn('[SettingsPage] Could not load settings data:', err.message);
      } finally {
        setIsLoadingUser(false);
      }
    };
    loadSettingsPageData();
  }, []);

  const updateNotificationSetting = async (key, value) => {
    const previous = notifs;
    const next = { ...notifs, [key]: value };
    setNotifs(next);
    setIsSavingNotifs(true);

    try {
      const saved = await settingsAPI.updateNotificationSettings(next);
      setNotifs(saved.notifications || next);
    } catch {
      setNotifs(previous);
    } finally {
      setIsSavingNotifs(false);
    }
  };

  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
    : 'User';
  
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
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="Profile" className="settings-avatar-img" />
          ) : (user?.firstName || user?.lastName) ? (
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

          <button className="settings-action-row" onClick={() => navigate('/change-password')}>
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
              onChange={(v) => updateNotificationSetting('studyReminders', v)}
              disabled={isSavingNotifs}
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
              onChange={(v) => updateNotificationSetting('noteSummaries', v)}
              disabled={isSavingNotifs}
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
              onChange={(v) => updateNotificationSetting('weeklyReport', v)}
              disabled={isSavingNotifs}
            />
          </div>

        </div>

        {/* ════ APPEARANCE ════ */}
        <div className="settings-card">
          <h4 className="settings-card-title">
            <MdColorLens size={18} /> Appearance
          </h4>

          {/* Theme */}
          <p className="settings-section-sub">Theme</p>
          <div className="appearance-row">
            {[
              { key: 'light',  label: 'Light',  icon: <MdBrightness7 size={20} /> },
              { key: 'dark',   label: 'Dark',   icon: <MdBrightness4 size={20} /> },
              { key: 'system', label: 'System', icon: <MdBrightnessAuto size={20} /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                className={`appearance-option ${themePref === key ? 'selected' : ''}`}
                onClick={() => updateTheme(key)}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Accent colour */}
          <p className="settings-section-sub" style={{ marginTop: 18 }}>Accent Colour</p>
          <div className="accent-row">
            {Object.entries(ACCENTS).map(([key, a]) => (
              <button
                key={key}
                className={`accent-swatch ${accent === key ? 'selected' : ''}`}
                style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                onClick={() => updateAccent(key)}
                title={a.name}
              />
            ))}
          </div>

          {/* Font size */}
          <p className="settings-section-sub" style={{ marginTop: 18 }}>Text Size</p>
          <div className="appearance-row">
            {[
              { key: 'normal', label: 'Normal', icon: <MdTextFields size={18} /> },
              { key: 'large',  label: 'Large',  icon: <MdTextFields size={22} /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                className={`appearance-option ${fontSize === key ? 'selected' : ''}`}
                onClick={() => updateFontSize(key)}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ════ ABOUT ════ */}
        <div className="settings-card">
          <h4 className="settings-card-title">
            <MdInfo size={18} /> About
          </h4>

          <div className="about-row">
            <span className="about-label">App Name</span>
            <span className="about-value">{about.appName}</span>
          </div>
          <div className="about-row">
            <span className="about-label">Version</span>
            <span className="about-value">{about.version}</span>
          </div>
          <div className="about-row">
            <span className="about-label">AI Model</span>
            <span className="about-value">{about.aiModel}</span>
          </div>
          <div className="about-row">
            <span className="about-label">Built with</span>
            <span className="about-value">{about.techStack}</span>
          </div>
          <div className="about-row" style={{ borderBottom: 'none' }}>
            <span className="about-label">Contact</span>
            <span className="about-value">{about.contact}</span>
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>

      {/* ── Bottom Nav ── */}
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
        <div className="nav-item active">
          <MdSettings size={26} />
        </div>
      </div>

      <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
