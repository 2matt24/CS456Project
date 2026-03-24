import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdSend, IoMdAttach } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdArrowBack, MdDeleteSweep } from 'react-icons/md';
import { RiRobot2Fill } from 'react-icons/ri';
import { FaUserCircle } from 'react-icons/fa';
import AddModal from '../components/AddModal';
import { notesAPI, chatAPI } from '../services/api';
import '../styles/ChatPage.css';

const API_BASE = 'https://cs456project.onrender.com';

async function sendChatMessage(userMessage, history, noteContext, fileContext) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message:     userMessage,
      history:     history.filter((m) => m.id !== 'welcome'),
      noteContext: noteContext ? { title: noteContext.title, content: noteContext.content } : null,
      fileContext: fileContext || null,
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

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'ai',
  text: "👋 Hi! I'm your AI Study Assistant. I can help you understand concepts, quiz you on your notes, suggest study strategies, and answer questions about your coursework. What would you like to study today?",
  timestamp: new Date(),
};

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allNotes, setAllNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [fileContext, setFileContext] = useState(null);
  const [fileName, setFileName] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load notes + chat history on mount
  useEffect(() => {
    (async () => {
      // ── 1. Load notes ──
      try {
        const coursesResp = await fetch('https://cs456project.onrender.com/api/courses', { credentials: 'include' });
        if (coursesResp.ok) {
          const coursesData = await coursesResp.json();
          const courses = coursesData.courses || [];
          const noteArrays = await Promise.all(courses.map((c) => notesAPI.getForCourse(c.courseID)));
          // flatten with correct course name per note
          const flat = [];
          courses.forEach((course, ci) => {
            (noteArrays[ci] || []).forEach((n) => flat.push({ ...n, courseName: course.courseName }));
          });
          setAllNotes(flat);
        }
      } catch (e) {
        console.warn('[ChatPage] note load failed:', e);
      }

      // ── 2. Load chat history ──
      try {
        const history = await chatAPI.getHistory(40);
        if (history.length > 0) {
          // History comes newest-first; reverse so oldest is at top
          const reversed = [...history].reverse();
          const histMsgs = [];
          reversed.forEach((h) => {
            histMsgs.push({
              id: `hist-u-${h.chatID}`,
              role: 'user',
              text: h.message,
              timestamp: new Date(h.createdAt),
              fromHistory: true,
            });
            if (h.response) {
              histMsgs.push({
                id: `hist-a-${h.chatID}`,
                role: 'ai',
                text: h.response,
                timestamp: new Date(h.createdAt),
                fromHistory: true,
              });
            }
          });
          setMessages([WELCOME_MESSAGE, ...histMsgs]);
        }
      } catch (e) {
        console.warn('[ChatPage] history load failed:', e);
      }
    })();
  }, []);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileContext(ev.target.result);
    reader.readAsText(file);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      // Backend calls Gemini and saves the exchange — one round-trip
      const aiText = await sendChatMessage(text, messages, selectedNote, fileContext);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: aiText, timestamp: new Date() }]);
    } catch (err) {
      console.warn('[ChatPage] AI request failed:', err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const clearChat = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    chatAPI.clearHistory(); // fire-and-forget
  };

  // Quick-prompt chips shown below the welcome message
  const quickPrompts = [
    '📝 Summarize my latest notes',
    '🧠 Quiz me on a topic',
    '💡 Give me study tips',
    '🔍 Explain a concept',
  ];

  const sendQuickPrompt = (prompt) => {
    setInputText(prompt);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  return (
    <>
    <div className="chat-container">
      {/* ── Top Navbar ── */}
      <div className="chat-navbar">
        <button className="chat-nav-btn" onClick={() => navigate('/dashboard')}>
          <MdArrowBack size={26} />
        </button>

        <div className="chat-nav-center">
          <div className="chat-nav-avatar">
            <RiRobot2Fill size={18} color="white" />
          </div>
          <div className="chat-nav-info">
            <h3>AI Study Assistant</h3>
            <span className="chat-online-dot">● Online</span>
          </div>
        </div>

        <button className="chat-nav-btn chat-clear-btn" onClick={clearChat} title="Clear chat">
          <MdDeleteSweep size={24} />
        </button>
      </div>

      {/* ── Context Bar: Note Selector + File Upload ── */}
      <div className="chat-context-bar">
        <select
          className="chat-note-select"
          value={selectedNote?.noteID || ''}
          onChange={(e) => {
            const note = allNotes.find((n) => n.noteID === parseInt(e.target.value));
            setSelectedNote(note || null);
          }}
        >
          <option value="">💬 General chat</option>
          {allNotes.map((n) => (
            <option key={n.noteID} value={n.noteID}>{n.title}</option>
          ))}
        </select>

        <label className="chat-upload-btn" title="Upload a file for context">
          <IoMdAttach size={18} />
          {fileName ? fileName.slice(0, 14) + (fileName.length > 14 ? '…' : '') : 'File'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </label>

        {(selectedNote || fileContext) && (
          <button className="chat-clear-context-btn" onClick={() => { setSelectedNote(null); setFileContext(null); setFileName(''); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={msg.id}>
            {/* "Today" separator at the very top */}
            {index === 0 && (
              <div className="chat-date-separator">
                <span>Today</span>
              </div>
            )}
            {/* "Previous conversations" separator — shown before first history msg */}
            {index === 1 && msg.fromHistory && (
              <div className="chat-date-separator chat-history-separator">
                <span>Previous conversations</span>
              </div>
            )}
            {/* "New messages" separator — first msg that is NOT from history after a history block */}
            {index > 1 && !msg.fromHistory && messages[index - 1]?.fromHistory && (
              <div className="chat-date-separator">
                <span>New</span>
              </div>
            )}

            <div className={`message-row ${msg.role === 'user' ? 'message-row-user' : 'message-row-ai'}`}>
              {/* AI avatar */}
              {msg.role === 'ai' && (
                <div className="msg-avatar ai-msg-avatar">
                  <RiRobot2Fill size={14} color="white" />
                </div>
              )}

              <div
                className={`message-bubble ${
                  msg.role === 'user'
                    ? 'user-bubble'
                    : msg.isError
                    ? 'error-bubble'
                    : 'ai-bubble'
                }`}
              >
                <p className="message-text">{msg.text}</p>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>

              {/* User avatar */}
              {msg.role === 'user' && (
                <div className="msg-avatar user-msg-avatar">
                  <FaUserCircle size={28} color="#667eea" />
                </div>
              )}
            </div>

            {/* Quick-prompt chips after the welcome message */}
            {index === 0 && (
              <div className="quick-prompts">
                {quickPrompts.map((p) => (
                  <button key={p} className="quick-prompt-chip" onClick={() => sendQuickPrompt(p)}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="message-row message-row-ai">
            <div className="msg-avatar ai-msg-avatar">
              <RiRobot2Fill size={14} color="white" />
            </div>
            <div className="message-bubble ai-bubble typing-bubble">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Ask me anything about your studies…"
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isTyping}
          />
          <button
            className={`chat-send-btn ${!inputText.trim() || isTyping ? 'disabled' : ''}`}
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            aria-label="Send message"
          >
            <IoMdSend size={20} />
          </button>
        </div>
        <p className="chat-hint">Enter to send · Shift+Enter for new line</p>
      </div>

      {/* ── Bottom Navigation ── */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => setIsAddModalOpen(true)}>
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

    <AddModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}

export default ChatPage;
