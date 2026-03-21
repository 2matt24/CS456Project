import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoMdAdd } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings } from 'react-icons/md';
import '../styles/PlaceholderPage.css';

function ChatPage() {
  const navigate = useNavigate();
  
  return (
    <div className="placeholder-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate('/dashboard')}>
          <IoArrowBack size={28} />
        </div>
        <h3>AI Chat</h3>
        <div style={{ width: '28px' }}></div>
      </div>

      <div className="placeholder-content">
        <div className="placeholder-icon">
          <MdChat size={80} color="#43e97b" />
        </div>
        <h2>AI Study Assistant</h2>
        <p>Chat with your AI study buddy to get help with homework, explanations, and study tips.</p>
        <div className="coming-soon-badge">Coming Soon</div>
        
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-icon">💬</span>
            <span>Ask questions about your notes</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📚</span>
            <span>Get study recommendations</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✨</span>
            <span>Generate practice questions</span>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/dashboard')}>
          <IoMdAdd size={28} />
        </div>
        <div className="nav-item" onClick={() => navigate('/calendar')}>
          <MdCalendarToday size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/dashboard')}>
          <MdHome size={26} />
        </div>
        <div className="nav-item active">
          <MdChat size={24} />
        </div>
        <div className="nav-item" onClick={() => navigate('/settings')}>
          <MdSettings size={26} />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;