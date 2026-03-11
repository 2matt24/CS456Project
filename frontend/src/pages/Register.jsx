import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/Login.css';

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authAPI.register(email, password, firstName, lastName);
      
      if (result.message) {
        alert('Registration successful! You can now login.');
        navigate('/');
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Cannot connect to server.');
      console.error('Register error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="app-title">Sign Up for<br/>StudyBuddyAI</h1>
        <p className="login-subtitle">Already have an account? <a href="/" style={{color: '#667eea'}}>Log in</a></p>
        
        <div className="robot-illustration">
          🤖
        </div>

        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="login-input"
            required
          />

          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="login-input"
            required
          />
          
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
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="terms-text">
          By creating an account, you agree to StudyBuddyAI's{' '}
          <a href="#">terms of use</a> and <a href="#">privacy policy</a>
        </p>
      </div>
    </div>
  );
}

export default Register;