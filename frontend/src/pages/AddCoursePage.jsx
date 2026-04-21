import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { MdArrowBack } from 'react-icons/md';
import { coursesAPI } from '../services/api';
import '../styles/AddCoursePage.css';

const COLORS    = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'];
const ICONS     = ['📚', '💻', '🧮', '🗄️', '🎨', '🔬', '📊', '🎭', '⚗️', '🏛️', '📖', '✏️'];
const SEMESTERS = ['Spring', 'Fall', 'Summer', 'Self-Paced'];
const YEARS     = ['2024', '2025', '2026', '2027', '2028'];

function AddCoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();          // present on /courses/:courseId/edit
  const isEditing = !!courseId;

  const [courseName, setCourseName]       = useState('');
  const [courseCode, setCourseCode]       = useState('');
  const [semester, setSemester]           = useState('');
  const [year, setYear]                   = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon]   = useState(ICONS[0]);
  const [isLoading, setIsLoading]         = useState(false);
  const [isFetching, setIsFetching]       = useState(false);
  const [error, setError]                 = useState('');

  // ── Pre-fill form when editing ──────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing) return;

    const loadCourseData = async () => {
      setIsFetching(true);
      try {
        const courses = await coursesAPI.getAll();
        const course  = courses.find(c => String(c.courseID) === String(courseId));
        if (!course) { setError('Course not found.'); return; }

        setCourseName(course.courseName || '');
        setCourseCode(course.courseCode || '');
        setStartDate(course.startDate   || '');
        setEndDate(course.endDate       || '');
        setSelectedColor(course.color   || COLORS[0]);
        setSelectedIcon(course.icon     || ICONS[0]);

        // Parse "Fall 2025" → semester="Fall", year="2025"
        if (course.semester) {
          const parts = course.semester.trim().split(/\s+/);
          setSemester(parts[0] || '');
          setYear(parts[1]     || '');
        }
      } catch {
        setError('Failed to load course data.');
      } finally {
        setIsFetching(false);
      }
    };

    loadCourseData();
  }, [courseId, isEditing]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const semesterLabel = [semester, year].filter(Boolean).join(' ') || undefined;

    try {
      if (isEditing) {
        await coursesAPI.update(courseId, {
          courseName,
          courseCode:  courseCode  || undefined,
          semester:    semesterLabel,
          color:       selectedColor,
          icon:        selectedIcon,
          startDate:   startDate   || undefined,
          endDate:     endDate     || undefined,
        });
      } else {
        await coursesAPI.create(
          courseName,
          courseCode,
          semesterLabel,
          selectedColor,
          selectedIcon,
          startDate || undefined,
          endDate   || undefined,
        );
      }
      navigate('/dashboard');
    } catch {
      setError(
        isEditing
          ? 'Failed to update course. Please try again.'
          : 'Failed to create course. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading while fetching existing course ──────────────────────────────────
  if (isFetching) {
    return (
      <div className="add-course-container">
        <div className="acp-navbar">
          <button className="acp-nav-btn" onClick={() => navigate('/dashboard')}>
            <MdArrowBack size={22} />
          </button>
          <h3>Edit Course</h3>
          <div style={{ width: 38 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#9aa0b4' }}>
          Loading course…
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="add-course-container">
      <div className="acp-navbar">
        <button className="acp-nav-btn" onClick={() => navigate('/dashboard')}>
          <MdArrowBack size={22} />
        </button>
        <h3>{isEditing ? 'Edit Course' : 'Add Course'}</h3>
        <div style={{ width: 38 }} />
      </div>

      <form onSubmit={handleSubmit} className="course-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Course Name *</label>
          <input
            type="text"
            placeholder="e.g., Data Structures"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Course Code</label>
          <input
            type="text"
            placeholder="e.g., CS201"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Semester</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">Select…</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select…</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Date <span className="label-optional">(optional)</span></label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>End Date <span className="label-optional">(optional)</span></label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Choose Color</label>
          <div className="color-picker">
            {COLORS.map((color) => (
              <div
                key={color}
                className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                style={{ background: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Choose Icon</label>
          <div className="icon-picker">
            {ICONS.map((icon) => (
              <div
                key={icon}
                className={`icon-option ${selectedIcon === icon ? 'selected' : ''}`}
                onClick={() => setSelectedIcon(icon)}
              >
                {icon}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-submit" disabled={isLoading}>
          {isLoading
            ? (isEditing ? 'Saving…' : 'Creating…')
            : <><IoCheckmarkCircle size={20} /> {isEditing ? 'Save Changes' : 'Create Course'}</>
          }
        </button>
      </form>
    </div>
  );
}

export default AddCoursePage;
