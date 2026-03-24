import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdCalendar } from 'react-icons/io';
import { MdArrowBack, MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import AddModal from '../components/AddModal';
import '../styles/PlaceholderPage.css';

function UploadSchedulePage() {
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <>
      <div className="placeholder-container">
        <div className="navbar">
          <div className="menu-icon" onClick={() => navigate(-1)}>
            <MdArrowBack size={28} />
          </div>
          <h3>Upload Schedule</h3>
          <div style={{ width: '28px' }} />
        </div>

        <div className="placeholder-content">
          <div className="placeholder-icon">
            <IoMdCalendar size={80} color="#43e97b" />
          </div>
          <h2>Upload Schedule</h2>
          <p>Import your class schedule — we'll automatically create courses, set up your calendar, and get your semester organized in seconds.</p>
          <div className="coming-soon-badge">Coming Soon</div>
        </div>

        <div className="bottom-nav">
          <div className="nav-item" onClick={() => setIsAddModalOpen(true)}>
            <IoMdAdd size={28} />
          </div>
          <div className="nav-item" onClick={() => navigate('/calendar')}>
            <MdCalendarToday size={24} />
          </div>
          <div className="nav-item" onClick={() => navigate('/dashboard')}>
            <MdHome size={26} />
          </div>
          <div className="nav-item" onClick={() => navigate('/chat')}>
            <MdChat size={24} />
          </div>
          <div className="nav-item" onClick={() => navigate('/settings')}>
            <MdSettings size={26} />
          </div>
        </div>
      </div>

      <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}

export default UploadSchedulePage;
