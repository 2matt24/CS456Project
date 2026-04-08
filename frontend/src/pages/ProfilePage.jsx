import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoMdAdd, IoMdCheckmark, IoMdClose,
} from 'react-icons/io';
import {
  MdCalendarToday, MdHome, MdChat, MdSettings, MdArrowBack,
  MdEdit, MdPerson, MdEmail, MdPhone, MdNotes,
} from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import { authAPI } from '../services/api';
import AddModal from '../components/AddModal';
import '../styles/ProfilePage.css';

const API_BASE = 'https://cs456project.onrender.com';

/* ─── helpers ─── */
function getInitials(firstName, lastName) {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName  || '').trim()[0] || '';
  return (f + l).toUpperCase() || '?';
}

function formatDate(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long',
  });
}

/* ─── sub-components ─── */
function InfoRow({ icon, label, value }) {
  return (
    <div className="info-row">
      <div className="info-row-icon">{icon}</div>
      <div className="info-row-body">
        <span className="info-row-label">{label}</span>
        <span className="info-row-value">
          {value || <em className="info-empty">Not set</em>}
        </span>
      </div>
    </div>
  );
}

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

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className={`profile-toast ${message.type}`}>
      {message.type === 'success'
        ? <IoMdCheckmark size={18} />
        : <IoMdClose size={18} />}
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
  const [user, setUser]             = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  /* ── profile picture ── */
  const [profilePicture, setProfilePicture]   = useState(null);
  const [isUploadingPic, setIsUploadingPic]   = useState(false);

  /* ── edit mode ── */
  const [isEditing, setIsEditing]     = useState(false);
  const [form, setForm]               = useState({
    firstName: '', lastName: '', email: '', phone: '', bio: '',
  });
  const [isSaving, setIsSaving]       = useState(false);
  const [profileMsg, setProfileMsg]   = useState(null);


  /* ── load user on mount ── */
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    console.log('[ProfilePage] Fetching user data from', `${API_BASE}/api/user/me`);
    setIsLoading(true);
    setFetchError('');

    try {
      const response = await fetch(`${API_BASE}/api/user/me`, {
        credentials: 'include',
      });

      console.log('[ProfilePage] Response status:', response.status);

      if (!response.ok) {
        // Try to parse error body, but don't crash if it's not JSON
        let errMsg = `Server returned ${response.status}`;
        try {
          const errBody = await response.json();
          errMsg = errBody.error || errMsg;
        } catch (_) {}
        console.error('[ProfilePage] Fetch failed:', errMsg);

        // Use fallback so the page still renders
        const fallback = {
          firstName: '', lastName: '', email: '',
          phone: '', bio: '', createdAt: null,
        };
        setUser(fallback);
        populateForm(fallback);
        setFetchError(`Could not load profile (${errMsg}). Showing empty form — you can still edit and save.`);
        return;
      }

      const data = await response.json();
      console.log('[ProfilePage] Received user data:', data);

      const u = data.user;
      setUser(u);
      setProfilePicture(u.profilePicture || null);
      populateForm(u);
    } catch (err) {
      console.error('[ProfilePage] Network error:', err);
      // Fallback — keep page usable even if backend is down
      const fallback = {
        firstName: '', lastName: '', email: '',
        phone: '', bio: '', createdAt: null,
      };
      setUser(fallback);
      populateForm(fallback);
      setFetchError('Could not reach server. You can still edit and save when it comes back online.');
    } finally {
      setIsLoading(false);
    }
  };

  const populateForm = (u) => {
    setForm({
      firstName: u.firstName || '',
      lastName:  u.lastName  || '',
      email:     u.email     || '',
      phone:     u.phone     || '',
      bio:       u.bio       || '',
    });
  };

  /* ── auto-dismiss toasts ── */
  useEffect(() => {
    if (!profileMsg) return;
    const t = setTimeout(() => setProfileMsg(null), 4000);
    return () => clearTimeout(t);
  }, [profileMsg]);

  /* ── form handlers ── */
  const handleFormChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCancelEdit = () => {
    setIsEditing(false);
    populateForm(user);
    setProfileMsg(null);
    console.log('[ProfilePage] Edit cancelled, form reset');
  };

  const handleSaveProfile = async () => {
    console.log('[ProfilePage] Saving profile with data:', form);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setProfileMsg({ text: 'First name, last name, and email are required.', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        phone:     form.phone.trim(),
        bio:       form.bio.trim(),
      };
      console.log('[ProfilePage] PUT /api/user/me payload:', payload);

      const response = await fetch(`${API_BASE}/api/user/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('[ProfilePage] Save response status:', response.status);

      if (!response.ok) {
        let errMsg = `Server returned ${response.status}`;
        try {
          const errBody = await response.json();
          errMsg = errBody.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      console.log('[ProfilePage] Save successful:', data);

      setUser(data.user);
      populateForm(data.user);
      setIsEditing(false);
      setProfileMsg({ text: '✓ Profile updated successfully!', type: 'success' });
    } catch (err) {
      console.error('[ProfilePage] Save error:', err);
      setProfileMsg({ text: err.message || 'Update failed. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  /* ── profile picture upload ── */
  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMsg({ text: 'Please upload an image file (JPG, PNG, GIF)', type: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ text: 'Image must be smaller than 5MB', type: 'error' });
      return;
    }

    setIsUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(`${API_BASE}/api/user/me/profile-picture`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setProfilePicture(data.profilePictureUrl);
      setUser(prev => ({ ...prev, profilePicture: data.profilePictureUrl }));
      setProfileMsg({ text: '✓ Profile picture updated!', type: 'success' });
    } catch (error) {
      setProfileMsg({ text: error.message || 'Failed to upload picture', type: 'error' });
    } finally {
      setIsUploadingPic(false);
    }
  };

  /* ── derived ── */
  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Your Name'
    : '';

  /* ── loading state ── */
  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="profile-navbar">
          <button className="profile-nav-btn" onClick={() => navigate('/dashboard')}>
            <MdArrowBack size={26} />
          </button>
          <h3>Profile</h3>
          <div style={{ width: 38 }} />
        </div>
        <div className="profile-loading">
          <div className="profile-spinner" />
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  /* ── main render ── */
  return (
    <div className="profile-container">

      {/* ── Navbar ── */}
      <div className="profile-navbar">
        <button className="profile-nav-btn" onClick={() => navigate('/dashboard')}>
          <MdArrowBack size={26} />
        </button>
        <h3>Profile</h3>
        <div style={{ width: 38 }} />
      </div>

      {/* ── Toasts ── */}
      <Toast message={profileMsg} />

      {/* ── Fetch-error banner (non-fatal) ── */}
      {fetchError && (
        <div className="profile-fetch-banner">
          ⚠️ {fetchError}
        </div>
      )}

      {/* ── Hero header ── */}
      <div className="profile-hero">
        <div className="profile-avatar" style={{ position: 'relative' }}>
          {profilePicture ? (
            <img
              src={profilePicture}
              alt="Profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (user?.firstName || user?.lastName) ? (
            <span className="profile-initials">
              {getInitials(user.firstName, user.lastName)}
            </span>
          ) : (
            <FaUserCircle size={52} color="rgba(255,255,255,0.85)" />
          )}

          <label
            className={`profile-pic-upload-btn${isUploadingPic ? ' uploading' : ''}`}
            title="Change profile picture"
          >
            {isUploadingPic
              ? <span className="btn-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
              : <MdEdit size={14} color="white" />
            }
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleProfilePictureUpload}
              disabled={isUploadingPic}
            />
          </label>
        </div>
        <h2 className="profile-hero-name">{fullName}</h2>
        <p className="profile-hero-email">{user?.email || 'No email set'}</p>
        <p className="profile-hero-joined">
          Member since {formatDate(user?.createdAt)}
        </p>
        {!isEditing && (
          <button className="btn-edit-profile" onClick={() => setIsEditing(true)}>
            <MdEdit size={16} /> Edit Profile
          </button>
        )}
      </div>

      <div className="profile-body">

        {/* ════ VIEW MODE ════ */}
        {!isEditing && (
          <>
            <div className="profile-card">
              <h4 className="profile-card-title"><MdPerson size={18} /> Personal Info</h4>
              <InfoRow icon={<MdPerson size={17} color="#667eea" />} label="First Name" value={user?.firstName} />
              <InfoRow icon={<MdPerson size={17} color="#667eea" />} label="Last Name"  value={user?.lastName} />
              <InfoRow icon={<MdEmail  size={17} color="#667eea" />} label="Email"      value={user?.email} />
              <InfoRow icon={<MdPhone  size={17} color="#667eea" />} label="Phone"      value={user?.phone} />
            </div>

            <div className="profile-card">
              <h4 className="profile-card-title"><MdNotes size={18} /> About Me</h4>
              <p className="profile-bio-text">
                {user?.bio || <em className="info-empty">No bio added yet.</em>}
              </p>
            </div>
          </>
        )}

        {/* ════ EDIT MODE ════ */}
        {isEditing && (
          <div className="profile-card edit-card">
            <h4 className="profile-card-title"><MdEdit size={18} /> Edit Profile</h4>

            <div className="edit-grid">
              <EditField label="First Name *" name="firstName" value={form.firstName}
                onChange={handleFormChange} placeholder="First name" maxLength={100} />
              <EditField label="Last Name *"  name="lastName"  value={form.lastName}
                onChange={handleFormChange} placeholder="Last name"  maxLength={100} />
            </div>

            <EditField label="Email *" name="email" value={form.email}
              onChange={handleFormChange} type="email" placeholder="your@email.com" maxLength={255} />
            <EditField label="Phone (optional)" name="phone" value={form.phone}
              onChange={handleFormChange} type="tel" placeholder="+1 (555) 000-0000" maxLength={30} />

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

            <div className="edit-actions">
              <button className="btn-cancel" onClick={handleCancelEdit} disabled={isSaving}>
                <IoMdClose size={18} /> Cancel
              </button>
              <button className="btn-save" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <span className="btn-spinner" /> : <IoMdCheckmark size={18} />}
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

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
        <div className="nav-item" onClick={() => navigate('/settings')}>
          <MdSettings size={26} />
        </div>
      </div>

      <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
