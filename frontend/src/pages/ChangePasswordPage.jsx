import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdCheckmark, IoMdClose } from 'react-icons/io';
import { MdArrowBack, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import '../styles/ProfilePage.css';

const API_BASE = 'https://cs456project.onrender.com';

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className={`profile-toast ${message.type}`}>
      {message.type === 'success' ? <IoMdCheckmark size={18} /> : <IoMdClose size={18} />}
      <span>{message.text}</span>
    </div>
  );
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const showToast = (text, type) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      showToast('All fields are required.', 'error');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (form.newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/user/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      if (!response.ok) {
        let errMsg = `Server returned ${response.status}`;
        try { const b = await response.json(); errMsg = b.error || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }

      showToast('✓ Password changed successfully!', 'success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => navigate('/settings'), 2000);
    } catch (err) {
      showToast(err.message || 'Password change failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const strength =
    form.newPassword.length === 0   ? null
    : form.newPassword.length >= 12 ? 'strong'
    : form.newPassword.length >= 8  ? 'medium'
    : 'weak';

  const strengthLabel = { strong: 'Strong 💪', medium: 'Medium 👍', weak: 'Weak ⚠️' };

  return (
    <div className="profile-container">

      {/* Navbar */}
      <div className="profile-navbar">
        <button className="profile-nav-btn" onClick={() => navigate('/settings')}>
          <MdArrowBack size={26} />
        </button>
        <h3>Change Password</h3>
        <div style={{ width: 38 }} />
      </div>

      <Toast message={toast} />

      {/* Hero */}
      <div className="profile-hero" style={{ paddingBottom: 28 }}>
        <div className="profile-avatar">
          <MdLock size={36} color="rgba(255,255,255,0.9)" />
        </div>
        <h2 className="profile-hero-name">Update Password</h2>
        <p className="profile-hero-email">Keep your account secure</p>
      </div>

      <div className="profile-body">
        <div className="profile-card edit-card">
          <h4 className="profile-card-title"><MdLock size={18} /> New Password</h4>

          {/* Current password */}
          <div className="edit-field pw-field">
            <label className="edit-field-label">Current Password</label>
            <div className="pw-input-wrap">
              <input
                type={showPw.current ? 'text' : 'password'}
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                className="edit-field-input"
                autoComplete="current-password"
              />
              <button type="button" className="pw-eye"
                onClick={() => setShowPw((p) => ({ ...p, current: !p.current }))}>
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
                value={form.newPassword}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="edit-field-input"
                autoComplete="new-password"
              />
              <button type="button" className="pw-eye"
                onClick={() => setShowPw((p) => ({ ...p, next: !p.next }))}>
                {showPw.next ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
              </button>
            </div>
          </div>

          {/* Strength bar */}
          {strength && (
            <div className={`pw-strength ${strength}`}>
              Strength: {strengthLabel[strength]}
            </div>
          )}

          {/* Confirm password */}
          <div className="edit-field pw-field">
            <label className="edit-field-label">Confirm New Password</label>
            <div className="pw-input-wrap">
              <input
                type={showPw.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your new password"
                className="edit-field-input"
                autoComplete="new-password"
              />
              <button type="button" className="pw-eye"
                onClick={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}>
                {showPw.confirm ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="edit-actions">
            <button
              className="btn-cancel"
              onClick={() => navigate('/settings')}
              disabled={isSaving}
            >
              <IoMdClose size={18} /> Cancel
            </button>
            <button
              className="btn-save-pw"
              style={{ flex: 2 }}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <span className="btn-spinner" /> : <MdLock size={16} />}
              {isSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}
