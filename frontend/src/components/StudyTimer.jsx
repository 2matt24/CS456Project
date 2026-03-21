import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MdPlayArrow, MdPause, MdRefresh } from 'react-icons/md';
import { IoMdTime } from 'react-icons/io';
import { FaBookOpen, FaCoffee } from 'react-icons/fa';
import { studySessionsAPI } from '../services/api';
import '../styles/StudyTimer.css';

function StudyTimer() {
  const { courseId } = useParams();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState('study');
  const intervalRef = useRef(null);

  const STUDY_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    
    if (sessionType === 'study' && courseId) {
      try {
        await studySessionsAPI.create(
          parseInt(courseId),
          'study',
          25
        );
        alert('Great work! 25-minute study session saved. Take a break!');
      } catch (error) {
        console.error('Failed to save study session:', error);
        alert('Study session complete! (Failed to save to database)');
      }
    } else {
      alert('Break over! Ready to study?');
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(sessionType === 'study' ? STUDY_TIME : BREAK_TIME);
  };

  const switchSession = (type) => {
    setSessionType(type);
    setIsRunning(false);
    setTimeLeft(type === 'study' ? STUDY_TIME : BREAK_TIME);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((sessionType === 'study' ? STUDY_TIME : BREAK_TIME) - timeLeft) / 
                   (sessionType === 'study' ? STUDY_TIME : BREAK_TIME) * 100;

  return (
    <div className="timer-container">
      <div className="timer-header">
        <h3><IoMdTime size={28} /> Study Timer</h3>
        <div className="session-toggle">
          <button 
            className={sessionType === 'study' ? 'active' : ''}
            onClick={() => switchSession('study')}
          >
            <FaBookOpen size={16} /> Study
          </button>
          <button 
            className={sessionType === 'break' ? 'active' : ''}
            onClick={() => switchSession('break')}
          >
            <FaCoffee size={16} /> Break
          </button>
        </div>
      </div>

      <div className="timer-display">
        <svg className="progress-ring" width="200" height="200">
          <circle
            className="progress-ring-circle-bg"
            stroke="#e0e0e0"
            strokeWidth="10"
            fill="transparent"
            r="90"
            cx="100"
            cy="100"
          />
          <circle
            className="progress-ring-circle"
            stroke={sessionType === 'study' ? '#667eea' : '#43e97b'}
            strokeWidth="10"
            fill="transparent"
            r="90"
            cx="100"
            cy="100"
            style={{
              strokeDasharray: `${2 * Math.PI * 90}`,
              strokeDashoffset: `${2 * Math.PI * 90 * (1 - progress / 100)}`,
            }}
          />
        </svg>
        <div className="time-text">{formatTime(timeLeft)}</div>
      </div>

      <div className="timer-controls">
        <button className="control-btn start-btn" onClick={toggleTimer}>
          {isRunning ? (
            <>
              <MdPause size={20} /> Pause
            </>
          ) : (
            <>
              <MdPlayArrow size={20} /> Start
            </>
          )}
        </button>
        <button className="control-btn reset-btn" onClick={resetTimer}>
          <MdRefresh size={20} /> Reset
        </button>
      </div>

      <div className="timer-stats">
        <div className="stat">
          <span className="stat-label">Session Type</span>
          <span className="stat-value">
            {sessionType === 'study' ? (
              <>
                <FaBookOpen size={18} /> Study
              </>
            ) : (
              <>
                <FaCoffee size={18} /> Break
              </>
            )}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Progress</span>
          <span className="stat-value">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}

export default StudyTimer;