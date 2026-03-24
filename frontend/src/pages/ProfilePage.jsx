import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoMdAdd, IoMdCheckmark, IoMdClose, IoMdLock,
} from 'react-icons/io';
import {
  MdCalendarToday, MdHome, MdChat, MdSettings, MdArrowBack,
  MdEdit, MdPerson, MdEmail, MdPhone, MdNotes, MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import { authAPI } from '../services/api';
import '../styles/ProfilePage.css';

/* ─── helpers ─── */
function getInitials(firstName, lastName) {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName  || '').trim()[0] || '';
  return (f + l).toUpperCase() || '?';
}

function formatDate(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* ─── sub-component: read-only info row ─── */
function InfoRow({ icon, label, value }) {
  return (
    <div className="info-row">
      <div className="info-row-icon">{icon}</div>
      <div className="info-row-body">
        <span className="info-row-label">{label}</span>
        <span className="info-row-value">{value || <em className="info-empty">Not set</em>}</span>
      </div>
    </div>
  );
}

/* ─── sub-component: editable field ─── */
function EditField({ label, name, value, onChange, type = 'text', placeholder = '', maxLength }) {
  return (
    <div className="edit-field">
      <label className="edit-field-label">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="edit-field-input"
        autoComplete="off"
      />
    </div>
  );
}

/* ─── sub-component: toast banner ─── */
function Toast({ message }) {
  if (!message) return null;
  return (
    <div className={`profile-toast ${message.type}`}>
      {message.type === 'success' ? <IoMdCheckmark size={18} /> : <IoMdClose size={18} />}
      <span>{message.text}</span>
    </div>
  );
}

/* ════════════════════════════════════════
   Main component
════════════════════════════════════════ */
export default function ProfilePage() {
  const navigate = useNavigate();

  /* ── data state ── */
  const [user, setUser]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  /* ── edit mode ── */
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm]           = useState({
    firstName: '', lastName: '', email: '', phone: '', bio: '',
  });
  const [isSaving, setIsSaving]   = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);   // { text, type }

  /* ── password section ── */
  const [showPwSection, setShowPwSection] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [showPw, setShowPw]       = useState({
    current: false, next: false, confirm: false,
  });
  const [isSavingPw, setIsSavingPw] = useState(false);
  const [pwMsg, setPwMsg]           = useState(null);

  /* ── load user on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await authAPI.getMe();
        const u = data.user;
        setUser(u);
        setForm({
          firstName: u.firstName || '',
          lastName:  u.lastName  || '',
          email:     u.email     || '',
          phone:     u.phone     || '',
          bio:       u.bio       || '',
        });
      } catch {
        setFetchError('Could not load profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /* ── dismiss toasts automatically ── */
  useEffect(() => {
    if (!profileMsg) return;
    const t = setTimeout(() => setProfileMsg(null), 4000);
    return () => clearTimeout(t);
  }, [profileMsg]);

  useEffect(() => {
    if (!pwMsg) return;
    const t = setTimeout(() => setPwMsg(null), 4000);
    return () => clearTimeout(t);
  }, [pwMsg]);

  /* ── handlers ── */
  const handleFormChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCancelEdit = () => {
    setIsEditing(false);
    setForm({
      firstName: user.firstName || '',
      lastName:  user.lastName  || '',
      email:     user.email     || '',
      phone:     user.phone     || '',
      bio:       user.bio       || '',
    });
    setProfileMsg(null);
  };

  const handleSaveProfile = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setProfileMsg({ text: 'First name, last name, and email are required.', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const data = await authAPI.updateProfile({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        phone:     form.phone.trim(),
        bio:       form.bio.trim(),
      });
      setUser(data.user);
      setIsEditing(false);
      setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setProfileMsg({ text: err.message || 'Update failed. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePwChange = (e) =>
    setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSavePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwMsg({ text: 'All password fields are required.', type: 'error' });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }
    setIsSavingPw(true);
    try {
      await authAPI.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPwSection(false);
      setPwMsg({ text: 'Password changed successfully!', type: 'success' });
    } catch (err) {
      setPwMsg({ text: err.message || 'Password change failed.', type: 'error' });
    } finally {
      setIsSavingPw(false);
    }
  };

  /* ── render helpers ── */
  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No Name'
    : '';

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="profile-spinner" />
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="profile-container">
        <p className="profile-fetch-error">{fetchError}</p>
        <button className="btn-back-dash" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* ── Navbar ── */}
      <div className="profile-navbar">
        <button className="profile-nav-btn" onClick={() => navigate('/dashboard')}>
          <MdArrowBack size={26} />
        </button>
        <h3>Profile</h3>
        {!isEditing ? (
          <button
            className="profile-nav-edit-btn"
            onClick={() => setIsEditing(true)}
            title="Edit profile"
          >
            <MdEdit size={20} />
          </button>
        ) : (
          <div style={{ width: 38 }} />
        )}
      </div>

      {/* ── Toast ── */}
      <Toast message={profileMsg} />
      <Toast message={pwMsg} />

      {/* ── Hero / avatar header ── */}
      <div className="profile-hero">
        <div className="profile-avatar">
          {user ? (
            <span className="profile-initials">{getInitials(user.firstName, user.lastName)}</span>
          ) : (
            <FaUserCircle size={60} color="rgba(255,255,255,0.8)" />
          )}
        </div>
        <h2 className="profile-hero-name">{fullName}</h2>
        <p className="profile-hero-email">{user?.email}</p>
        <p className="profile-hero-joined">Member since {formatDate(user?.createdAt)}</p>

        {!isEditing && (
          <button
            className="btn-edit-profile"
            onClick={() => setIsEditing(true)}
          >
            <MdEdit size={16} />
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-body">

        {/* ════ VIEW MODE ════ */}
        {!isEditing && (
          <>
            {/* Personal Info card */}
            <div className="profile-card">
              <h4 className="profile-card-title">
                <MdPerson size={18} /> Personal Info
              </h4>
              <InfoRow
                icon={<MdPerson size={17} color="#667eea" />}
                label="First Name"
                value={user?.firstName}
              />
              <InfoRow
                icon={<MdPerson size={17} color="#667eea" />}
                label="Last Name"
                value={user?.lastName}
              />
              <InfoRow
                icon={<MdEmail size={17} color="#667eea" />}
                label="Email"
                value={user?.email}
              />
              <InfoRow
                icon={<MdPhone size={17} color="#667eea" />}
                label="Phone"
                value={user?.phone}
              />
            </div>

            {/* Bio card */}
            <div className="profile-card">
              <h4 className="profile-card-title">
                <MdNotes size={18} /> About Me
              </h4>
              <p className="profile-bio-text">
                {user?.bio || <em className="info-empty">No bio added yet.</em>}
              </p>
            </div>
          </>
        )}

        {/* ════ EDIT MODE ════ */}
        {isEditing && (
          <div className="profile-card edit-card">
            <h4 className="profile-card-title">
              <MdEdit size={18} /> Edit Profile
            </h4>

            <div className="edit-grid">
              <EditField
                label="First Name *"
                name="firstName"
                value={form.firstName}
                onChange={handleFormChange}
                placeholder="First name"
                maxLength={100}
              />
              <EditField
                label="Last Name *"
                name="lastName"
                value={form.lastName}
                onChange={handleFormChange}
                placeholder="Last name"
                maxLength={100}
              />
            </div>

            <EditField
              label="Email *"
              name="email"
              value={form.email}
              onChange={handleFormChange}
              type="email"
              placeholder="your@email.com"
              maxLength={255}
            />
            <EditField
              label="Phone (optional)"
              name="phone"
              value={form.phone}
              onChange={handleFormChange}
              type="tel"
              placeholder="+1 (555) 000-0000"
              maxLength={30}
            />

            <div className="edit-field">
              <label className="edit-field-label">Bio (optional)</label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleFormChange}
                placeholder="Tell us a little about yourself…"
                maxLength={500}
                className="edit-field-textarea"
                rows={3}
              />
              <span className="char-count">{form.bio.length} / 500</span>
            </div>

            {/* Save / Cancel */}
            <div className="edit-actions">
              <button
                className="btn-cancel"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <IoMdClose size={18} />
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="btn-spinner" />
                ) : (
                  <IoMdCheckmark size={18} />
                )}
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ════ CHANGE PASSWORD ════ */}
        <div className="profile-card">
          <button
            className="pw-toggle-header"
            onClick={() => setShowPwSection((v) => !v)}
          >
            <span className="profile-card-title" style={{ margin: 0 }}>
              <IoMdLock size={18} /> Change Password
            </span>
            <span className={`pw-chevron ${showPwSection ? 'open' : ''}`}>▾</span>
          </button>

          {showPwSection && (
            <div className="pw-form">
              {/* Current password */}
              <div className="edit-field pw-field">
                <label className="edit-field-label">Current Password</label>
                <div className="pw-input-wrap">
                  <input
                    type={showPw.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={pwForm.currentPassword}
                    onChange={handlePwChange}
                    placeholder="Enter current password"
                    className="edit-field-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setShowPw((p) => ({ ...p, current: !p.current }))}
                  >
                    {showPw.current ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="edit-field pw-field">
                <label className="edit-field-label">New Password</label>
                <div className="pw-input-wrap">
                  <input
                    type={showPw.next ? 'text' : 'password'}
                    name="newPassword"
                    value={pwForm.newPassword}
                    onChange={handlePwChange}
                    placeholder="At least 6 characters"
                    className="edit-field-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setShowPw((p) => ({ ...p, next: !p.next }))}
                  >
                    {showPw.next ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="edit-field pw-field">
                <label className="edit-field-label">Confirm New Password</label>
                <div className="pw-input-wrap">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={pwForm.confirmPassword}
                    onChange={handlePwChange}
                    placeholder="Repeat new password"
                    className="edit-field-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}
                  >
                    {showPw.confirm ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                  </button>
                </div>
              </div>

              {/* strength hint */}
              {pwForm.newPassword.length > 0 && (
                <div className={`pw-strength ${
                  pwForm.newPassword.length >= 12 ? 'strong'
                  : pwForm.newPassword.length >= 8  ? 'medium'
                  : 'weak'
                }`}>
                  Password strength:{' '}
                  {pwForm.newPassword.length >= 12 ? 'Strong'
                   : pwForm.newPassword.length >= 8  ? 'Medium'
                   : 'Weak'}
                </div>
              )}

              <button
                className="btn-save-pw"
                onClick={handleSavePassword}
                disabled={isSavingPw}
              >
                {isSavingPw ? <span className="btn-spinner" /> : <IoMdLock size={16} />}
                {isSavingPw ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}
        </div>

        {/* bottom spacer for nav */}
        <div style={{ height: 16 }} />
      </div>

      {/* ── Bottom Navigation ── */}
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
        <div className="nav-item" onClick={() => navigate('/settings')}>
          <MdSettings size={26} />
        </div>
      </div>
    </div>
  );
}
