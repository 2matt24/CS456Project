import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdClose, IoMdAdd, IoMdCalendar } from 'react-icons/io';
import '../styles/AddModal.css';

function AddModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAddCourse = () => {
    onClose();
    navigate('/courses/new');
  };

  const handleUploadSchedule = () => {
    onClose();
    navigate('/schedule/upload');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>What would you like to add?</h2>
          <button className="close-btn" onClick={onClose}>
            <IoMdClose size={28} />
          </button>
        </div>

        <div className="modal-options">
          <div className="option-card" onClick={handleAddCourse}>
            <div className="option-icon" style={{ background: '#667eea' }}>
              <IoMdAdd size={40} color="white" />
            </div>
            <h3>Add Course</h3>
            <p>Create a new course to track notes and study sessions</p>
          </div>

          <div className="option-card" onClick={handleUploadSchedule}>
            <div className="option-icon" style={{ background: '#43e97b' }}>
              <IoMdCalendar size={40} color="white" />
            </div>
            <h3>Upload Schedule</h3>
            <p>Import your class schedule for automatic course creation</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddModal;
