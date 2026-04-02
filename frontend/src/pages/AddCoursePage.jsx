import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { MdArrowBack } from 'react-icons/md';
import { coursesAPI } from '../services/api';
import '../styles/AddCoursePage.css';

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'];
const ICONS  = ['📚', '💻', '🧮', '🗄️', '🎨', '🔬', '📊', '🎭', '⚗️', '🏛️', '📖', '✏️'];
const SEMESTERS = ['Spring', 'Fall', 'Summer', 'Self-Paced'];
const YEARS = ['2024', '2025', '2026', '2027', '2028'];

function AddCoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const isEditMode = Boolean(courseId);
  const [courseName, setCourseName]       = useState('');
  const [courseCode, setCourseCode]       = useState('');
  const [semester, setSemester]           = useState('');
  const [year, setYear]                   = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon]   = useState(ICONS[0]);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        const allCourses = await coursesAPI.getAll();
        const currentCourse = allCourses.find((c) => c.courseID === Number(courseId));
        if (!currentCourse) {
          setError('Course not found.');
          return;
        }
        setCourseName(currentCourse.courseName || '');
        setCourseCode(currentCourse.courseCode || '');
        setSelectedColor(currentCourse.color || COLORS[0]);
        setSelectedIcon(currentCourse.icon || ICONS[0]);
        setStartDate(currentCourse.startDate || '');
        setEndDate(currentCourse.endDate || '');

        const semesterParts = (currentCourse.semester || '').split(' ');
        const maybeYear = semesterParts[semesterParts.length - 1];
        if (/^\d{4}$/.test(maybeYear)) {
          setYear(maybeYear);
          setSemester(semesterParts.slice(0, -1).join(' '));
        } else {
          setSemester(currentCourse.semester || '');
        }
      } catch {
        setError('Failed to load course details.');
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, [courseId, isEditMode]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Build semester label e.g. "Fall 2025"
    const semesterLabel = [semester, year].filter(Boolean).join(' ') || undefined;

    try {
      if (isEditMode) {
        await coursesAPI.update(courseId, {
          courseName,
          courseCode,
          semester: semesterLabel,
          color: selectedColor,
          icon: selectedIcon,
          startDate: startDate || null,
          endDate: endDate || null,
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
    } catch (err) {
      setError(`Failed to ${isEditMode ? 'update' : 'create'} course. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isBootstrapping) {
    return (
      <div className="add-course-container">
        <div className="acp-navbar">
          <button className="acp-nav-btn" onClick={() => navigate('/dashboard')}>
            <MdArrowBack size={22} />
          </button>
          <h3>Edit Course</h3>
          <div style={{ width: 38 }} />
        </div>
        <form className="course-form">
          <div className="error-message">Loading course details…</div>
        </form>
      </div>
    );
  }


  return (
    <div className="add-course-container">
      <div className="acp-navbar">
        <button className="acp-nav-btn" onClick={() => navigate('/dashboard')}>
          <MdArrowBack size={22} />
        </button>
        <h3>{isEditMode ? 'Edit Course' : 'Add Course'}</h3>
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
          {isLoading ? (isEditMode ? 'Saving…' : 'Creating…') : <><IoCheckmarkCircle size={20} /> {isEditMode ? 'Save Changes' : 'Create Course'}</>}
        </button>
      </form>
    </div>
  );
}

export default AddCoursePage;
