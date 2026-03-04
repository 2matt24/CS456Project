import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { IoMdNotifications, IoMdAdd, IoMdCamera, IoMdCreate } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import { FaUserCircle, FaFileUpload } from 'react-icons/fa';
import '../styles/CoursePage.css';

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const course = {
    name: 'Data Structures',
    code: 'CS201',
    schedule: 'Spring 25 | Tues/Thurs 11am - 12:30pm | JU STEAM 102',
  };

  // Mock notes
  const notes = [
    { id: 1, title: 'Lesson 6 Summary', date: '2/15/2025', rating: 4 },
    { id: 2, title: 'Lesson 7 - Linked Lists', date: '2/18/2025', rating: 5 },
    { id: 3, title: 'Arrays Overview', date: '2/12/2025', rating: 3 },
  ];

  return (
    <div className="course-container">
      {/* Top navigation */}
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate('/dashboard')}>
          <IoArrowBack size={28} />
        </div>
        <div className="nav-icons">
          <span className="icon">
            <IoMdNotifications size={24} />
          </span>
          <span className="icon">
            <FaUserCircle size={24} />
          </span>
        </div>
      </div>

      {/* Course header */}
      <div className="course-header">
        <h2 className="course-title">{course.name}</h2>
        <p className="course-code">{course.code}</p>
        <p className="course-info">{course.schedule}</p>
      </div>

      {/* Upload Options */}
      <div className="upload-options">
        <div 
          className="upload-option"
          onClick={() => navigate(`/course/${courseId}/notes/scan`)}
        >
          <IoMdCamera size={40} />
          <span>Scan Notes</span>
        </div>
        
        <div 
          className="upload-option"
          onClick={() => navigate(`/course/${courseId}/notes/upload`)}
        >
          <FaFileUpload size={36} />
          <span>Upload File</span>
        </div>
        
        <div 
          className="upload-option"
          onClick={() => navigate(`/course/${courseId}/notes/new`)}
        >
          <IoMdCreate size={40} />
          <span>Type Manually</span>
        </div>
      </div>

      {/* Notes Directory */}
      <div className="notes-section">
        <h3 className="section-title">Notes Directory</h3>
        {notes.map(note => (
          <div 
            key={note.id} 
            className="note-item"
            onClick={() => navigate(`/course/${courseId}/note/${note.id}`)}
          >
            <div className="note-icon">📝</div>
            <div className="note-details">
              <h4>{note.title}</h4>
              <p className="note-date">{note.date}</p>
              <div className="rating">
                {'⭐'.repeat(note.rating)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button 
          className="btn-action btn-primary"
          onClick={() => navigate(`/course/${courseId}/quick-study`)}
        >
          ⚡ Quick Study
        </button>
      </div>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="nav-item">
          <IoMdAdd size={28} />
        </div>
        <div className="nav-item">
          <MdCalendarToday size={24} />
        </div>
        <div className="nav-item active">
          <MdHome size={26} />
        </div>
        <div className="nav-item">
          <MdChat size={24} />
        </div>
        <div className="nav-item">
          <MdSettings size={26} />
        </div>
      </div>
    </div>
  );
}

export default CoursePage;