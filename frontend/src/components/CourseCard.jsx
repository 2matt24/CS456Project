import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CourseCard.css';

function CourseCard({ course }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/course/${course.id}`);
  };

  return (
    <div className="course-card" style={{ borderColor: course.color }} onClick={handleClick}>
      <div className="course-icon" style={{ background: course.color }}>
        {course.icon}
      </div>
      <h4 className="course-name">{course.name}</h4>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: '60%', background: course.color }}></div>
      </div>
    </div>
  );
}

export default CourseCard;