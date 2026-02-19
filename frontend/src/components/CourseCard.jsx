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
                <p className="course-code">{course.code || 'CS101'}</p>

                <div className="course-stats">
                    <span className="stat-item">
                        📚 <span className="stat-value">12 notes</span>
                    </span>
                    <span className="stat-item">
                        ⏱️ <span className="stat-value">5.2 hrs</span>
                    </span>
                    <span className="stat-item">
                        ✅ <span className="stat-value">8 tasks</span>
                    </span>
                </div>

                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '65%', background: course.color }}></div>
                </div>
            </div>
        </div>
    );
}

export default CourseCard;