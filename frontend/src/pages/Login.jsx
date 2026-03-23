import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { IoRocket } from 'react-icons/io5';
import { authAPI } from '../services/api';
import '../styles/Login.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cs456project.onrender.com';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const { token, oauthError } = authAPI.consumeOAuthRedirectToken();
    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (token) {
      navigate('/dashboard');
      return;
    }

    authAPI.getSession().then((session) => {
      if (session.authenticated) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await authAPI.login(email, password);
      if (result.message === 'Login successful' || result.user) {
        navigate('/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Cannot connect to server.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const handleAppleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/apple`;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="app-title">Welcome to<br/>StudyBuddyAI</h1>
        <p className="login-subtitle">Already Registered? Log in below</p>

        <div className="robot-illustration">
          <IoRocket size={80} color="white" />
        </div>

        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="login-input" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="login-input" required />
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="divider"><span>or</span></div>

        <button className="btn-primary" onClick={() => navigate('/register')}>Sign up with Email</button>
        <button className="btn-oauth btn-google" onClick={handleGoogleLogin}><FcGoogle size={24} /><span>Continue with Google</span></button>
        <button className="btn-oauth btn-apple" onClick={handleAppleLogin}><FaApple size={24} /><span>Continue with Apple</span></button>

        <p className="terms-text">
          By creating an account, you agree to StudyBuddyAI's <a href="#">terms of use</a> and <a href="#">privacy policy</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
