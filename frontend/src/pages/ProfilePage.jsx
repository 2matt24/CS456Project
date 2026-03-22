import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';

function ProfilePage() {
  const navigate = useNavigate();
  
  return (
    <div className="page-container">
      <div className="navbar">
        <div className="menu-icon" onClick={() => navigate(-1)}>
          <MdArrowBack size={28} />
        </div>
        <h3>Profile</h3>
        <div style={{ width: '28px' }}></div>
      </div>
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Profile page coming soon!</p>
      </div>
    </div>
  );
}

export default ProfilePage;