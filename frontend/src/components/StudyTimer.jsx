import React, { useState, useEffect, useRef } from 'react';
import '../styles/StudyTimer.css';

function StudyTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState('study'); // 'study' or 'break'
  const intervalRef = useRef(null);

  // Timer durations
  const STUDY_TIME = 25 * 60; // 25 minutes
  const BREAK_TIME = 5 * 60; // 5 minutes

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer finished
      handleTimerComplete();
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    // Play sound or show notification here
    alert(sessionType === 'study' ? 'Study session complete! Take a break.' : 'Break over! Ready to study?');
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

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = ((sessionType === 'study' ? STUDY_TIME : BREAK_TIME) - timeLeft) / 
                   (sessionType === 'study' ? STUDY_TIME : BREAK_TIME) * 100;

  return (
    <div className="timer-container">
      <div className="timer-header">
        <h3>⏰ Study Timer</h3>
        <div className="session-toggle">
          <button 
            className={sessionType === 'study' ? 'active' : ''}
            onClick={() => switchSession('study')}
          >
            Study
          </button>
          <button 
            className={sessionType === 'break' ? 'active' : ''}
            onClick={() => switchSession('break')}
          >
            Break
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
          {isRunning ? '⏸ Pause' : '▶ Start'}
        </button>
        <button className="control-btn reset-btn" onClick={resetTimer}>
          🔄 Reset
        </button>
      </div>

      <div className="timer-stats">
        <div className="stat">
          <span className="stat-label">Session Type</span>
          <span className="stat-value">{sessionType === 'study' ? '📚 Study' : '☕ Break'}</span>
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