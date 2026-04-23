import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoBookSharp } from 'react-icons/io5';
import { MdAccessTime, MdCheckCircle } from 'react-icons/md';
import '../styles/CourseCard.css';

function progressLabel(course) {
  if (course.daysLeft != null) {
    if (course.daysLeft === 0) return 'Completed';
    return `${course.daysLeft}d left`;
  }
  return `${course.notesCount ?? 0} notes`;
}

export default function CourseCard({ course }) {
  const navigate  = useNavigate();
  const id        = course.courseID ?? course.id;
  const progress  = course.progress  ?? 0;
  const notesCount = course.notesCount ?? 0;
  const label     = progressLabel(course);

  return (
    <div
      className="course-card"
      style={{ borderColor: course.color }}
      onClick={() => navigate(`/course/${id}`)}
    >
      <div className="course-icon" style={{ background: course.color }}>
        <span style={{ fontSize: 28 }}>{course.icon}</span>
      </div>

      <div className="course-info">
        <h4 className="course-name">{course.courseName ?? course.name}</h4>
        <p  className="course-code">{course.courseCode ?? course.code ?? ''}</p>

        <div className="course-stats">
          <span className="stat-item">
            <IoBookSharp size={13} color="#667eea" />
            <span className="stat-value">{`${notesCount} notes`}</span>
          </span>
          <span className="stat-item">
            <MdAccessTime size={13} color="#43e97b" />
            <span className="stat-value">{course.semester || '—'}</span>
          </span>
          <span className="stat-item">
            <MdCheckCircle size={13} color="#feca57" />
            <span className="stat-value">{label}</span>
          </span>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%`, background: course.color }}
          />
        </div>

        <p className="progress-pct">{progress}% complete</p>
      </div>
    </div>
  );
}
