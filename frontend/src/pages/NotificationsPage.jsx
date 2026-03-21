import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';

function NotificationsPage() {
  const navigate = useNavigate();
  
  return (
    <div className="page-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate(-1)}>
          <IoArrowBack size={28} />
        </div>
        <h3>Notifications</h3>
        <div style={{ width: '28px' }}></div>
      </div>
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Notifications coming soon!</p>
      </div>
    </div>
  );
}

export default NotificationsPage;