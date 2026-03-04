import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/Login.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authAPI.login(email, password);
      
      if (result.message === "Login successful" || result.user) {
        navigate('/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      setError('Cannot connect to server.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="app-title">Welcome to<br/>StudyBuddyAI</h1>
        <p className="login-subtitle">Already Registered? Log in below</p>
        
        <div className="robot-illustration">
          🤖
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
          />

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit"
            className="btn-primary" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <button className="btn-primary" onClick={() => navigate('/register')}>
        Sign up with Email
        </button>
        <button className="btn-secondary">
          <span className="google-icon"></span> Sign up with Google
        </button>
        <button className="btn-secondary">
          <span className="apple-icon"></span> Sign up with Apple
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