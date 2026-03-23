import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoBookSharp } from 'react-icons/io5';
import { MdAccessTime, MdCheckCircle } from 'react-icons/md';
import { notesAPI, studySessionsAPI } from '../services/api';
import '../styles/CourseCard.css';

function CourseCard({ course }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ notesCount: 0, studyHours: 0, progress: 0 });

  useEffect(() => {
    let isMounted = true;

    const loadCourseStats = async () => {
      try {
        const notes = await notesAPI.getForCourse(course.id);
        const weeklyStats = await studySessionsAPI.getWeeklyStats(course.id);
        if (isMounted) {
          setStats({ notesCount: notes.length, studyHours: weeklyStats.hoursThisWeek, progress: weeklyStats.progress });
        }
      } catch (error) {
        console.error('Failed to load course stats:', error);
      }
    };

    loadCourseStats();
    return () => {
      isMounted = false;
    };
  }, [course.id]);

  const handleClick = () => {
    navigate(`/course/${course.id}`);
  };

  return (
    <div className="course-card" style={{ borderColor: course.color }} onClick={handleClick}>
      <div className="course-icon" style={{ background: course.color }}>{course.icon}</div>
      <div className="course-info">
        <h4 className="course-name">{course.name}</h4>
        <p className="course-code">{course.code || 'No code'}</p>
        <div className="course-stats">
          <span className="stat-item"><IoBookSharp size={14} color="#667eea" /><span className="stat-value">{stats.notesCount} notes</span></span>
          <span className="stat-item"><MdAccessTime size={14} color="#43e97b" /><span className="stat-value">{stats.studyHours} hrs</span></span>
          <span className="stat-item"><MdCheckCircle size={14} color="#feca57" /><span className="stat-value">{Math.round(stats.progress)}%</span></span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${stats.progress}%`, background: course.color }} /></div>
      </div>
    </div>
  );
}

export default CourseCard;
