import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CourseCard.css';

function CourseCard({ course }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/course/${course.id}`);
  };

  return (
    <div
      className="course-card"
      style={{ borderColor: course.color }}
      onClick={handleClick}
    >
      <div className="course-icon" style={{ background: course.color }}>
        {course.icon}
      </div>

      <div className="course-info">
        <h4 className="course-name">{course.name}</h4>
        <p className="course-code">{course.code || 'No code'}</p>

        <div className="course-stats">
          <span className="stat-item">
            📚 <span className="stat-value">{course.noteCount} notes</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;
