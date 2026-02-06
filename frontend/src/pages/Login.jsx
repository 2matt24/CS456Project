import { useNavigate } from 'react-router-dom';
import React from 'react';
import '../styles/Login.css';

function Login() {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="app-title">Welcome to<br/>StudyBuddyAI</h1>
        <p className="login-subtitle">Already Registered? <a href="#">Log in here</a></p>
        
        <div className="robot-illustration">
          🤖
        </div>

        <button className="btn-primary" onClick={handleSignUp}>Sign up with Email</button>
        <button className="btn-secondary">
          <span className="google-icon">G</span> Sign up with Google
        </button>
        <button className="btn-secondary">
          <span className="apple-icon">🍎</span> Sign up with Apple
        </button>

        <p className="terms-text">
          By creating an account, you agree to StudyBuddyAI's{' '}
          <a href="#">terms of use</a> and <a href="#">privacy policy</a>
        </p>
      </div>
    </div>
  );
}

export default Login;