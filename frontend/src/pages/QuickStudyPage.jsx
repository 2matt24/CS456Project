import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoMdSend } from 'react-icons/io';
import {
  MdArrowBack, MdPlayArrow, MdPause, MdReplay, MdSkipNext,
} from 'react-icons/md';
import { RiRobot2Fill } from 'react-icons/ri';
import { FaUserCircle } from 'react-icons/fa';
import { coursesAPI, notesAPI } from '../services/api';
import '../styles/QuickStudyPage.css';

const API_BASE = 'https://cs456project.onrender.com';

async function sendChatMessage(userMessage, history, noteContext) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message:     userMessage,
      history:     history.filter((m) => m.id !== 'welcome'),
      noteContext: noteContext ? { title: noteContext.title, content: noteContext.content } : null,
      noteId:      noteContext?.noteID || null,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${response.status}`);
  }
  const data = await response.json();
  const text = data?.response;
  if (!text) throw new Error('Empty response from server');
  return text;
}

const STUDY_MINUTES = 25;
const BREAK_MINUTES = 5;
const STUDY_SECS    = STUDY_MINUTES * 60;
const BREAK_SECS    = BREAK_MINUTES * 60;

/* SVG circle math */
const RADIUS = 54;
const CIRC   = 2 * Math.PI * RADIUS;

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const CHAT_PROMPTS = [
  { label: '🔍 Explain key concepts', text: 'Explain the most important concepts from these notes in simple terms.' },
  { label: '📝 Practice questions',   text: 'Create 5 practice exam questions based on these notes.' },
];

/* ════════════════════════════════════
   Component
════════════════════════════════════ */
export default function QuickStudyPage() {
  const navigate  = useNavigate();
  const { courseId } = useParams();

  /* ── Data ── */
  const [course, setCourse]   = useState(null);
  const [notes, setNotes]     = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Timer ── */
  const [mode, setMode]           = useState('study'); // 'study' | 'break'
  const [secondsLeft, setSecondsLeft] = useState(STUDY_SECS);
  const [running, setRunning]     = useState(false);
  const [sessions, setSessions]   = useState(0);
  const intervalRef               = useRef(null);
  const sessionStartRef           = useRef(null);

  /* ── Chat ── */
  const [messages, setMessages]   = useState([{
    id: 'welcome',
    role: 'ai',
    text: '👋 Hi! Select a note above, then ask me anything about it — I can summarize it, quiz you, explain concepts, or create practice questions.',
    timestamp: new Date(),
  }]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const messagesEndRef            = useRef(null);
  const textareaRef               = useRef(null);

  /* ── Completion modal ── */
  const [showModal, setShowModal] = useState(false);

  /* ── AI Summary / Quiz ── */
  const [summary, setSummary]                     = useState('');
  const [quizQuestions, setQuizQuestions]         = useState([]);
  const [selectedAnswers, setSelectedAnswers]     = useState({});
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz]   = useState(false);

  /* ─── Load course + notes ─── */
  useEffect(() => {
    (async () => {
      try {
        const allCourses = await coursesAPI.getAll();
        const c = allCourses.find((x) => x.courseID === parseInt(courseId));
        setCourse(c || null);
        const n = await notesAPI.getForCourse(courseId);
        setNotes(n);
      } catch (err) {
        console.error('[QuickStudy] load error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [courseId]);

  /* ─── Timer tick ─── */
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            handleTimerEnd();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  /* ─── Auto-scroll chat ─── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ─── Helpers ─── */
  const handleTimerEnd = useCallback(async () => {
    setRunning(false);

    if (mode === 'study') {
      const elapsed = Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 60000) || STUDY_MINUTES;
      setSessions((s) => s + 1);

      // Log to backend (non-fatal)
      try {
        await fetch('https://cs456project.onrender.com/api/study-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            courseId: parseInt(courseId),
            sessionType: 'study',
            durationMinutes: elapsed,
          }),
        });
      } catch (e) {
        console.warn('[QuickStudy] session log failed:', e);
      }

      setMode('break');
      setSecondsLeft(BREAK_SECS);
    } else {
      setMode('study');
      setSecondsLeft(STUDY_SECS);
      setShowModal(true);
    }
  }, [mode, courseId]);

  const startTimer = () => {
    if (mode === 'study') sessionStartRef.current = Date.now();
    setRunning(true);
  };

  const pauseTimer = () => setRunning(false);

  const resetTimer = () => {
    setRunning(false);
    setMode('study');
    setSecondsLeft(STUDY_SECS);
  };

  const skipToBreak = () => {
    setRunning(false);
    setMode('break');
    setSecondsLeft(BREAK_SECS);
  };

  /* ─── Chat send ─── */
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const aiText = await sendChatMessage(text, [...messages], selectedNote);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: aiText, timestamp: new Date() }]);
    } catch (err) {
      console.warn('[QuickStudy] AI request failed:', err.message);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: "I'm having trouble connecting right now. Try again in a moment!",
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };

  const sendQuickPrompt = (text) => {
    setInputText(text);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  /* ── AI Summary ── */
  const handleSummarizeNote = async () => {
    if (!selectedNote?.noteID || isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    setSummary('');
    try {
      const resp = await fetch(`${API_BASE}/api/notes/${selectedNote.noteID}/summarize`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate summary');
      }
      const data = await resp.json();
      setSummary(data.summary || '');
    } catch (err) {
      console.error('[QuickStudy] summarize error:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  /* ── AI Quiz ── */
  const handleQuizMe = async () => {
    if (!selectedNote?.content || isGeneratingQuiz) return;
    setIsGeneratingQuiz(true);
    setQuizQuestions([]);
    setSelectedAnswers({});
    try {
      const resp = await fetch(`${API_BASE}/api/notes/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: selectedNote.content, questionCount: 5, difficulty: 'medium' }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Quiz generation failed');
      }
      const data = await resp.json();
      setQuizQuestions(data.questions || []);
    } catch (err) {
      console.error('[QuickStudy] quiz error:', err);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerSelect = (questionIndex, letter) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: letter }));
  };

  /* ─── Derived ─── */
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const total    = mode === 'study' ? STUDY_SECS : BREAK_SECS;
  const progress = secondsLeft / total;
  const dashOffset = CIRC * progress;

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="qs-container">
        <div className="qs-loading">
          <div className="qs-spinner" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="qs-container">

      {/* ── Navbar ── */}
      <div className="qs-navbar">
        <button className="qs-nav-btn" onClick={() => navigate(`/course/${courseId}`)}>
          <MdArrowBack size={24} />
        </button>
        <div className="qs-nav-center">
          {course && (
            <div className="qs-nav-icon" style={{ background: course.color }}>
              {course.icon}
            </div>
          )}
          <div>
            <h3 className="qs-nav-title">Quick Study</h3>
            {course && <p className="qs-nav-sub">{course.courseName}</p>}
          </div>
        </div>
      </div>

      {/* ── Note selector ── */}
      <div className="qs-note-selector">
        <label className="qs-selector-label">Study note:</label>
        <select
          className="qs-select"
          value={selectedNote?.noteID || ''}
          onChange={(e) => {
            const note = notes.find((n) => n.noteID === parseInt(e.target.value));
            setSelectedNote(note || null);
            // Clear previous AI results when switching notes
            setSummary('');
            setQuizQuestions([]);
            setSelectedAnswers({});
          }}
        >
          <option value="">— Select a note —</option>
          {notes.map((n) => (
            <option key={n.noteID} value={n.noteID}>{n.title}</option>
          ))}
        </select>
      </div>

      {/* ── Pomodoro timer ── */}
      <div className="qs-timer-card">
        <div className={`qs-mode-badge ${mode === 'study' ? 'study' : 'break'}`}>
          {mode === 'study' ? '📚 Study Session' : '☕ Break Time'}
        </div>

        <div className="qs-ring-wrap">
          <svg className="qs-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={RADIUS} className="qs-ring-bg" />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              className={`qs-ring-fg ${mode === 'study' ? 'ring-study' : 'ring-break'}`}
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC - dashOffset}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="qs-ring-time">
            <span className="qs-time-digits">{mins}:{secs}</span>
            <span className="qs-time-label">{mode === 'study' ? 'focus' : 'break'}</span>
          </div>
        </div>

        <div className="qs-timer-controls">
          {!running ? (
            <button className="qs-ctrl-btn primary" onClick={startTimer}>
              <MdPlayArrow size={26} />
            </button>
          ) : (
            <button className="qs-ctrl-btn primary" onClick={pauseTimer}>
              <MdPause size={26} />
            </button>
          )}
          <button className="qs-ctrl-btn secondary" onClick={resetTimer} title="Reset">
            <MdReplay size={22} />
          </button>
          {mode === 'study' && (
            <button className="qs-ctrl-btn secondary" onClick={skipToBreak} title="Skip to break">
              <MdSkipNext size={22} />
            </button>
          )}
        </div>
      </div>

      {/* ── Quick-prompt chips ── */}
      <div className="qs-quick-prompts">
        {/* Real API buttons */}
        <button
          className={`qs-chip qs-chip-ai ${isGeneratingSummary ? 'loading' : ''}`}
          onClick={handleSummarizeNote}
          disabled={!selectedNote || isGeneratingSummary}
        >
          {isGeneratingSummary ? '⏳ Generating…' : '📋 Summarize this note'}
        </button>
        <button
          className={`qs-chip qs-chip-ai ${isGeneratingQuiz ? 'loading' : ''}`}
          onClick={handleQuizMe}
          disabled={!selectedNote || isGeneratingQuiz}
        >
          {isGeneratingQuiz ? '⏳ Creating Quiz…' : '🧠 Quiz me'}
        </button>
        {/* Chat pre-fill chips */}
        {CHAT_PROMPTS.map((p) => (
          <button
            key={p.label}
            className="qs-chip"
            onClick={() => sendQuickPrompt(p.text)}
            disabled={!selectedNote}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Summary result ── */}
      {summary && (
        <div className="qs-summary-section">
          <div className="qs-summary-hdr">
            <span>✨ AI Summary</span>
            <button
              className="qs-summary-regen"
              onClick={handleSummarizeNote}
              disabled={isGeneratingSummary}
              title="Regenerate"
            >
              🔄
            </button>
          </div>
          <div className="qs-summary-text">{summary}</div>
        </div>
      )}

      {/* ── Quiz result ── */}
      {quizQuestions.length > 0 && (
        <div className="qs-quiz-section">
          <div className="qs-quiz-hdr">
            <span className="qs-quiz-hdr-title">🧠 Practice Quiz</span>
            <span className="qs-quiz-hdr-count">{quizQuestions.length} questions</span>
          </div>

          {quizQuestions.map((q, idx) => {
            const selected = selectedAnswers[idx];
            return (
              <div key={idx} className="qs-quiz-question">
                <p className="qs-quiz-q-num">Question {idx + 1}</p>
                <p className="qs-quiz-q-text">{q.question}</p>

                <div className="qs-quiz-options">
                  {q.options.map((opt, i) => {
                    const letter     = String.fromCharCode(65 + i);
                    const isCorrect  = letter === q.correctAnswer;
                    const isSelected = selected === letter;
                    return (
                      <button
                        key={i}
                        className={`qs-quiz-option${isSelected ? (isCorrect ? ' correct' : ' incorrect') : ''}`}
                        onClick={() => !selected && handleAnswerSelect(idx, letter)}
                        disabled={!!selected}
                      >
                        <span className="qs-quiz-opt-letter">{letter}</span>
                        <span className="qs-quiz-opt-text">{opt}</span>
                        {isSelected && (
                          <span className="qs-quiz-indicator">
                            {isCorrect ? '✓' : '✗'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selected && (
                  <div className="qs-quiz-explanation">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          <button
            className="qs-quiz-regen"
            onClick={handleQuizMe}
            disabled={isGeneratingQuiz}
          >
            {isGeneratingQuiz ? '⏳ Regenerating…' : '🔄 Generate New Quiz'}
          </button>
        </div>
      )}

      {/* ── AI Chat ── */}
      <div className="qs-chat-section">
        <h4 className="qs-chat-title">
          <RiRobot2Fill size={16} />
          AI Study Assistant
        </h4>

        <div className="qs-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`qs-msg-row ${msg.role === 'user' ? 'qs-msg-user' : 'qs-msg-ai'}`}
            >
              {msg.role === 'ai' && (
                <div className="qs-msg-avatar ai">
                  <RiRobot2Fill size={12} color="white" />
                </div>
              )}
              <div className={`qs-bubble ${
                msg.role === 'user' ? 'qs-bubble-user'
                : msg.isError ? 'qs-bubble-error'
                : 'qs-bubble-ai'
              }`}>
                <p className="qs-bubble-text">{msg.text}</p>
                <span className="qs-bubble-time">{formatTime(msg.timestamp)}</span>
              </div>
              {msg.role === 'user' && (
                <div className="qs-msg-avatar user">
                  <FaUserCircle size={22} color="#667eea" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="qs-msg-row qs-msg-ai">
              <div className="qs-msg-avatar ai">
                <RiRobot2Fill size={12} color="white" />
              </div>
              <div className="qs-bubble qs-bubble-ai qs-typing-bubble">
                <div className="qs-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="qs-input-row">
          <textarea
            ref={textareaRef}
            className="qs-textarea"
            placeholder={selectedNote ? `Ask about "${selectedNote.title}"…` : 'Select a note to start chatting…'}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isTyping}
          />
          <button
            className={`qs-send-btn ${!inputText.trim() || isTyping ? 'disabled' : ''}`}
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            <IoMdSend size={18} />
          </button>
        </div>
        <p className="qs-hint">Enter to send · Shift+Enter for new line</p>
      </div>

      {/* ── Session complete modal ── */}
      {showModal && (
        <div className="qs-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="qs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qs-modal-icon">🎉</div>
            <h3>Session Complete!</h3>
            <p>You just finished a {STUDY_MINUTES}-minute study session. Great work!</p>
            <p className="qs-modal-count">Total sessions today: <strong>{sessions}</strong></p>
            <div className="qs-modal-btns">
              <button className="qs-modal-btn primary" onClick={() => { setShowModal(false); startTimer(); }}>
                Start Another
              </button>
              <button className="qs-modal-btn secondary" onClick={() => navigate(`/course/${courseId}`)}>
                Back to Course
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
