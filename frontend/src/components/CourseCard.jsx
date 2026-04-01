import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoBookSharp } from 'react-icons/io5';
import { MdAccessTime, MdCheckCircle } from 'react-icons/md';
import { notesAPI } from '../services/api';
import '../styles/CourseCard.css';

/* ─── Progress calculation ───────────────────────────────────────────
 *  Priority order:
 *    1. Time-based  — if course has startDate AND endDate → % of time elapsed
 *    2. Notes-based — notesCount / a default goal of 20 notes (capped at 100)
 *    3. Zero        — no data available yet
 * ─────────────────────────────────────────────────────────────────── */
function calcProgress(course, notesCount) {
  const { startDate, endDate } = course;

  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end   = new Date(endDate).getTime();
    const now   = Date.now();
    if (end <= start) return 0;
    const pct = ((now - start) / (end - start)) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  // Fallback: notes progress toward a 20-note default goal
  const DEFAULT_GOAL = 20;
  return Math.min(100, Math.round((notesCount / DEFAULT_GOAL) * 100));
}

function progressLabel(course, notesCount, pct) {
  if (course.startDate && course.endDate) {
    const end = new Date(course.endDate);
    const now = new Date();
    if (now > end) return 'Completed';
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return `${daysLeft}d left`;
  }
  return `${notesCount} notes`;
}

export default function CourseCard({ course }) {
  const navigate = useNavigate();
  const [notesCount, setNotesCount] = useState(0);
  const [studyHours, setStudyHours] = useState(0);
  const [isLoading,  setIsLoading]  = useState(true);

  // Support both courseID (from API) and id (legacy)
  const id = course.courseID ?? course.id;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const notes = await notesAPI.getForCourse(id);
        setNotesCount(Array.isArray(notes) ? notes.length : 0);
      } catch {
        setNotesCount(0);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const progress = calcProgress(course, notesCount);
  const label    = progressLabel(course, notesCount, progress);

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
            <span className="stat-value">{isLoading ? '…' : `${notesCount} notes`}</span>
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
