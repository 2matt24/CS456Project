import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { coursesAPI } from '../services/api';
import '../styles/AddCoursePage.css';

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'];
const ICONS = ['📚', '💻', '🧮', '🗄️', '🎨', '🔬', '📊', '🎭', '⚗️', '🏛️', '📖', '✏️'];

function AddCoursePage() {
  const navigate = useNavigate();
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await coursesAPI.create(courseName, courseCode, semester, selectedColor, selectedIcon);
      navigate('/dashboard');
    } catch {
      setError('Failed to create course. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-course-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate('/dashboard')}>
          <IoArrowBack size={28} />
        </div>
        <h3>Add Course</h3>
        <div style={{ width: '28px' }}></div>
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

        <div className="form-group">
          <label>Semester</label>
          <input
            type="text"
            placeholder="e.g., Spring 2025"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Choose Color</label>
          <div className="color-picker">
            {COLORS.map(color => (
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
            {ICONS.map(icon => (
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
          {isLoading ? 'Creating...' : 'Create Course'}
        </button>
      </form>
    </div>
  );
}

export default AddCoursePage;