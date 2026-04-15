import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSchool, MdAccessTime, MdPalette, MdCheckCircle, MdCameraAlt, MdCalendarMonth, MdArrowForward } from 'react-icons/md';
import { FaUserCircle } from 'react-icons/fa';
import '../styles/OnboardingModal.css';

const API_BASE = 'https://cs456project.onrender.com';

const TOTAL_STEPS = 7;

const GRADE_LEVELS = [
  'High School', 'Freshman', 'Sophomore', 'Junior', 'Senior',
  'Graduate Student', 'Other',
];

const STUDY_TIMES = [
  { value: 'Morning',   label: '🌅 Morning',   sub: '6am – 12pm' },
  { value: 'Afternoon', label: '☀️ Afternoon',  sub: '12pm – 5pm' },
  { value: 'Evening',   label: '🌆 Evening',    sub: '5pm – 9pm' },
  { value: 'Night',     label: '🌙 Night',      sub: '9pm – 2am' },
  { value: 'Flexible',  label: '🔄 Flexible',   sub: 'Whenever works' },
];

const ACCENT_COLORS = [
  { value: '#667eea', label: 'Purple' },
  { value: '#f093fb', label: 'Pink' },
  { value: '#4facfe', label: 'Blue' },
  { value: '#43e97b', label: 'Green' },
  { value: '#fa709a', label: 'Rose' },
  { value: '#f6d365', label: 'Amber' },
  { value: '#fd7014', label: 'Orange' },
  { value: '#2d3748', label: 'Dark' },
];

function ProgressBar({ step, total }) {
  const pct = ((step - 1) / (total - 1)) * 100;
  return (
    <div className="ob-progress-track">
      <div className="ob-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main component
══════════════════════════════════════════════ */
export default function OnboardingModal({ firstName, onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form state
  const [schoolName, setSchoolName]                 = useState('');
  const [gradeLevel, setGradeLevel]                 = useState('');
  const [major, setMajor]                           = useState('');
  const [occupation, setOccupation]                 = useState('');
  const [studyGoalHours, setStudyGoalHours]         = useState(10);
  const [preferredStudyTime, setPreferredStudyTime] = useState('');
  const [accentColor, setAccentColor]               = useState('#667eea');
  const [profilePicPreview, setProfilePicPreview]   = useState(null);
  const [profilePicFile, setProfilePicFile]         = useState(null);
  const [picStatus, setPicStatus]                   = useState(''); // '', 'uploading', 'done', 'error'
  const [isSaving, setIsSaving]                     = useState(false);

  const picInputRef = useRef(null);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));
  const skipToEnd = () => setStep(TOTAL_STEPS);

  /* ── profile picture local preview ── */
  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfilePicFile(file);
    setPicStatus('');
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePicPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── save onboarding data ── */
  const saveOnboarding = async () => {
    // Upload profile picture first if chosen
    if (profilePicFile) {
      setPicStatus('uploading');
      try {
        const formData = new FormData();
        formData.append('profilePicture', profilePicFile);
        const res = await fetch(`${API_BASE}/api/user/me/profile-picture`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        setPicStatus(res.ok ? 'done' : 'error');
      } catch {
        setPicStatus('error');
      }
    }

    // Save onboarding fields
    await fetch(`${API_BASE}/api/user/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        schoolName:            schoolName || null,
        gradeLevel:            gradeLevel || null,
        major:                 major      || null,
        occupation:            occupation || null,
        studyGoalHoursPerWeek: studyGoalHours,
        preferredStudyTime:    preferredStudyTime || null,
        accentColor,
      }),
    }).catch(() => {});
  };

  /* ── finish and stay on dashboard ── */
  const handleComplete = async () => {
    setIsSaving(true);
    try { await saveOnboarding(); } catch { /* continue anyway */ }
    setIsSaving(false);
    onComplete();
  };

  /* ── finish and navigate to a specific page ── */
  const handleCompleteAndNavigate = async (path) => {
    setIsSaving(true);
    try { await saveOnboarding(); } catch { /* continue anyway */ }
    setIsSaving(false);
    onComplete();
    navigate(path);
  };

  /* ── slider fill style ── */
  const sliderPct = ((studyGoalHours - 1) / 39) * 100;
  const sliderBg  = `linear-gradient(to right, #667eea 0%, #667eea ${sliderPct}%, #e4e8f0 ${sliderPct}%, #e4e8f0 100%)`;

  /* ── step renders ── */
  const renderStep = () => {
    switch (step) {

      /* ── Step 1: Welcome ── */
      case 1:
        return (
          <div className="ob-step">
            <div className="ob-welcome-emoji">👋</div>
            <h2 className="ob-title">Welcome, {firstName || 'there'}!</h2>
            <p className="ob-subtitle">
              Let's set up your study profile in just a few quick steps so we
              can personalize your experience.
            </p>
            <ul className="ob-welcome-list">
              <li><MdSchool size={18} color="#667eea" /> Student profile</li>
              <li><MdAccessTime size={18} color="#667eea" /> Study goals</li>
              <li><MdCalendarMonth size={18} color="#667eea" /> Schedule setup</li>
              <li><MdPalette size={18} color="#667eea" /> App theme</li>
            </ul>
          </div>
        );

      /* ── Step 2: Profile ── */
      case 2:
        return (
          <div className="ob-step">
            <div className="ob-step-icon"><MdSchool size={32} color="#667eea" /></div>
            <h2 className="ob-title">Your Student Profile</h2>
            <p className="ob-subtitle">Tell us a little about your academic situation.</p>

            <div className="ob-field">
              <label>School / University</label>
              <input
                type="text"
                placeholder="e.g. University of Florida"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="ob-field">
              <label>Grade Level</label>
              <div className="ob-chip-grid">
                {GRADE_LEVELS.map(g => (
                  <button
                    key={g}
                    className={`ob-chip ${gradeLevel === g ? 'ob-chip-active' : ''}`}
                    onClick={() => setGradeLevel(g)}
                    type="button"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="ob-field">
              <label>Major / Field of Study <span className="ob-optional">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={major}
                onChange={e => setMajor(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="ob-field">
              <label>Occupation <span className="ob-optional">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Part-time barista"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                maxLength={255}
              />
            </div>
          </div>
        );

      /* ── Step 3: Study Goals ── */
      case 3:
        return (
          <div className="ob-step">
            <div className="ob-step-icon"><MdAccessTime size={32} color="#667eea" /></div>
            <h2 className="ob-title">Study Goals</h2>
            <p className="ob-subtitle">How much time do you want to dedicate to studying each week?</p>

            <div className="ob-field">
              <label>Target hours per week</label>
              <div className="ob-slider-wrap">
                <div className="ob-slider-val-big">{studyGoalHours}<span>h</span></div>
                <input
                  type="range"
                  min={1}
                  max={40}
                  step={1}
                  value={studyGoalHours}
                  onChange={e => setStudyGoalHours(Number(e.target.value))}
                  className="ob-slider"
                  style={{ background: sliderBg }}
                />
                <div className="ob-slider-labels">
                  <span>1h</span><span>10h</span><span>20h</span><span>30h</span><span>40h</span>
                </div>
              </div>
            </div>

            <div className="ob-field">
              <label>When do you prefer to study?</label>
              <div className="ob-time-list">
                {STUDY_TIMES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    className={`ob-time-item ${preferredStudyTime === t.value ? 'ob-time-active' : ''}`}
                    onClick={() => setPreferredStudyTime(t.value)}
                  >
                    <span className="ob-time-label">{t.label}</span>
                    <span className="ob-time-sub">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      /* ── Step 4: Schedule ── */
      case 4:
        return (
          <div className="ob-step ob-step-center">
            <div className="ob-step-icon"><MdCalendarMonth size={32} color="#667eea" /></div>
            <h2 className="ob-title">Set Up Your Schedule</h2>
            <p className="ob-subtitle">
              Import your class schedule or add events manually. You can do this now or come back later.
            </p>

            <div className="ob-schedule-options">
              <button
                className="ob-schedule-card ob-schedule-clickable"
                type="button"
                onClick={() => handleCompleteAndNavigate('/schedule/upload')}
                disabled={isSaving}
              >
                <span className="ob-schedule-emoji">📅</span>
                <div className="ob-schedule-text">
                  <strong>Upload a schedule</strong>
                  <span>Import from a PDF or image</span>
                </div>
                <MdArrowForward size={20} className="ob-schedule-arrow" />
              </button>

              <button
                className="ob-schedule-card ob-schedule-clickable"
                type="button"
                onClick={() => handleCompleteAndNavigate('/calendar')}
                disabled={isSaving}
              >
                <span className="ob-schedule-emoji">✏️</span>
                <div className="ob-schedule-text">
                  <strong>Add events manually</strong>
                  <span>Enter classes and deadlines by hand</span>
                </div>
                <MdArrowForward size={20} className="ob-schedule-arrow" />
              </button>
            </div>

            <p className="ob-skip-note">Or press Next to set this up later.</p>
          </div>
        );

      /* ── Step 5: Profile Picture ── */
      case 5:
        return (
          <div className="ob-step ob-step-center">
            <div className="ob-step-icon"><MdCameraAlt size={32} color="#667eea" /></div>
            <h2 className="ob-title">Add a Profile Photo</h2>
            <p className="ob-subtitle">Put a face to your name — totally optional!</p>

            <div className="ob-avatar-wrap">
              {profilePicPreview ? (
                <img src={profilePicPreview} alt="Preview" className="ob-avatar-preview" />
              ) : (
                <FaUserCircle size={90} color="#c4c9d8" />
              )}
              <button
                className="ob-avatar-btn"
                type="button"
                onClick={() => picInputRef.current?.click()}
              >
                {profilePicPreview ? 'Change photo' : 'Choose photo'}
              </button>
              {profilePicPreview && (
                <p className="ob-pic-note">📸 Photo selected — will upload when you finish.</p>
              )}
              <input
                ref={picInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePicChange}
              />
            </div>
          </div>
        );

      /* ── Step 6: Theme ── */
      case 6:
        return (
          <div className="ob-step ob-step-center">
            <div className="ob-step-icon"><MdPalette size={32} color="#667eea" /></div>
            <h2 className="ob-title">Choose Your Theme Color</h2>
            <p className="ob-subtitle">Pick an accent color that feels like you.</p>

            <div className="ob-color-grid">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  className={`ob-color-swatch ${accentColor === c.value ? 'ob-color-active' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => setAccentColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>

            <div className="ob-color-preview" style={{ background: accentColor }}>
              <span>Preview</span>
            </div>
          </div>
        );

      /* ── Step 7: Complete ── */
      case 7:
        return (
          <div className="ob-step ob-step-center">
            <div className="ob-complete-icon">
              <MdCheckCircle size={64} color="#43e97b" />
            </div>
            <h2 className="ob-title">You're all set, {firstName || 'there'}! 🎉</h2>
            <p className="ob-subtitle">Here's a quick summary of your setup:</p>

            <div className="ob-summary">
              {schoolName && (
                <div className="ob-summary-row">
                  <span className="ob-summary-label">School</span>
                  <span className="ob-summary-val">{schoolName}</span>
                </div>
              )}
              {gradeLevel && (
                <div className="ob-summary-row">
                  <span className="ob-summary-label">Grade</span>
                  <span className="ob-summary-val">{gradeLevel}</span>
                </div>
              )}
              {major && (
                <div className="ob-summary-row">
                  <span className="ob-summary-label">Major</span>
                  <span className="ob-summary-val">{major}</span>
                </div>
              )}
              <div className="ob-summary-row">
                <span className="ob-summary-label">Weekly goal</span>
                <span className="ob-summary-val">{studyGoalHours} hours</span>
              </div>
              {preferredStudyTime && (
                <div className="ob-summary-row">
                  <span className="ob-summary-label">Study time</span>
                  <span className="ob-summary-val">{preferredStudyTime}</span>
                </div>
              )}
              <div className="ob-summary-row">
                <span className="ob-summary-label">Theme</span>
                <span className="ob-summary-color" style={{ background: accentColor }} />
              </div>
            </div>

            {picStatus === 'error' && (
              <p className="ob-pic-error">⚠️ Profile photo couldn't be uploaded — you can try again from the Profile page.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ob-overlay">
      <div className="ob-modal">

        {/* Progress */}
        <div className="ob-header">
          <p className="ob-step-label">Step {step} of {TOTAL_STEPS}</p>
          <ProgressBar step={step} total={TOTAL_STEPS} />
        </div>

        {/* Step content */}
        <div className="ob-body">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="ob-footer">
          {step > 1 && step < TOTAL_STEPS && (
            <button className="ob-btn-back" onClick={back} type="button">
              ← Back
            </button>
          )}

          {step === 1 && (
            <button className="ob-btn-skip" onClick={skipToEnd} type="button">
              Skip setup
            </button>
          )}

          <div style={{ flex: 1 }} />

          {step < TOTAL_STEPS ? (
            <button className="ob-btn-next" onClick={next} type="button">
              {step === 1 ? "Let's go →" : 'Next →'}
            </button>
          ) : (
            <button
              className="ob-btn-finish"
              onClick={handleComplete}
              disabled={isSaving}
              type="button"
            >
              {isSaving ? 'Saving…' : 'Go to Dashboard →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
