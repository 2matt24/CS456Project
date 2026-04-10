import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdSend, IoMdMenu, IoMdClose, IoMdTrash } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdArrowBack, MdDeleteSweep } from 'react-icons/md';
import { RiRobot2Fill } from 'react-icons/ri';
import { FaUserCircle } from 'react-icons/fa';
import AddModal from '../components/AddModal';
import { chatAPI } from '../services/api';
import '../styles/ChatPage.css';

const API_BASE = 'https://cs456project.onrender.com';

/* ── Markdown renderer ── */
function parseInline(text, key = 0) {
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = [];
  let last = 0, match, i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const raw = match[0];
    if (raw.startsWith('***'))      parts.push(<strong key={i++}><em>{raw.slice(3,-3)}</em></strong>);
    else if (raw.startsWith('**'))  parts.push(<strong key={i++}>{raw.slice(2,-2)}</strong>);
    else if (raw.startsWith('*'))   parts.push(<em key={i++}>{raw.slice(1,-1)}</em>);
    else if (raw.startsWith('`'))   parts.push(<code key={i++} style={{background:'#f0f0f0',padding:'1px 5px',borderRadius:4,fontSize:'0.88em',fontFamily:'monospace'}}>{raw.slice(1,-1)}</code>);
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const bulletMatch = line.match(/^(\s*)(\*|-|•|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      const items = [];
      while (i < lines.length) {
        const bl = lines[i].match(/^(\s*)(\*|-|•|\d+\.)\s+(.*)$/);
        if (!bl) break;
        items.push(<li key={i} style={{marginBottom:2}}>{parseInline(bl[3])}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} style={{paddingLeft:20,margin:'4px 0'}}>{items}</ul>);
      continue;
    }
    if (line.match(/^#{1,3}\s/)) {
      const content = line.replace(/^#{1,3}\s/, '');
      elements.push(<strong key={i} style={{display:'block',marginTop:6,marginBottom:2}}>{parseInline(content)}</strong>);
    } else if (line.trim() === '') {
      elements.push(<br key={i} />);
    } else {
      elements.push(<span key={i} style={{display:'block'}}>{parseInline(line)}</span>);
    }
    i++;
  }
  return elements;
}

async function sendChatMessage(userMessage, history, courseContext, sessionId, conversationTitle) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message:           userMessage,
      history:           history.filter(m => m.id !== 'welcome' && m.role !== 'system'),
      courseContext:     courseContext || null,
      sessionId:         sessionId || null,
      conversationTitle: conversationTitle || null,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${response.status}`);
  }
  const data = await response.json();
  if (!data?.response) throw new Error('Empty response from server');
  return { text: data.response, sessionId: data.sessionId };
}

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'ai',
  text: "👋 Hi! I'm your AI Study Assistant powered by Gemini. I can explain concepts, quiz you on any topic, summarize notes, and suggest study strategies. What would you like to work on today?",
  timestamp: new Date(),
};

function formatTime(date) {
  const d = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')
    ? new Date(date + 'Z')
    : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const QUICK_PROMPTS = [
  { label: '📝 Summarize notes', text: 'Help me summarize key concepts from my recent study session.' },
  { label: '🧠 Quiz me',         text: 'Quiz me on this topic — ask me 3 questions one at a time.' },
  { label: '💡 Study tips',      text: 'Give me your best evidence-based study tips for retaining information.' },
  { label: '🔍 Explain this',    text: 'Explain this concept simply, as if I were new to the subject.' },
];

/* ════════════════════════════════════
   Component
════════════════════════════════════ */
function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages]   = useState([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Courses for context selector
  const [allCourses, setAllCourses]     = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null); // full course object or null

  // Sidebar / conversation history
  const [showSidebar, setShowSidebar]               = useState(false);
  const [savedConversations, setSavedConversations] = useState([]);
  const [currentSessionId, setCurrentSessionId]     = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  // Load courses + history on mount
  useEffect(() => {
    (async () => {
      try {
        const coursesResp = await fetch(`${API_BASE}/api/courses`, { credentials: 'include' });
        if (coursesResp.ok) {
          const coursesData = await coursesResp.json();
          setAllCourses(coursesData.courses || []);
        }
      } catch (e) {
        console.warn('[ChatPage] courses load failed:', e);
      }

      try {
        const history = await chatAPI.getHistory(40);
        if (history.length > 0) {
          // Restore the most recent session so new messages continue it
          const mostRecent = history[0]; // history is desc order
          if (mostRecent?.sessionId) setCurrentSessionId(mostRecent.sessionId);

          // Only show messages from the most recent session in the chat window
          const recentSid = mostRecent?.sessionId;
          const sessionHistory = recentSid
            ? history.filter(h => h.sessionId === recentSid)
            : history.slice(0, 10);

          const reversed = [...sessionHistory].reverse();
          const histMsgs = [];
          reversed.forEach(h => {
            histMsgs.push({ id: `hist-u-${h.chatID}`, role: 'user', text: h.message, timestamp: new Date(h.createdAt), fromHistory: true });
            if (h.response) {
              histMsgs.push({ id: `hist-a-${h.chatID}`, role: 'ai', text: h.response, timestamp: new Date(h.createdAt), fromHistory: true });
            }
          });
          setMessages([WELCOME_MESSAGE, ...histMsgs]);
        }
      } catch (e) {
        console.warn('[ChatPage] history load failed:', e);
      }
    })();
  }, []);

  // Load conversations for sidebar on mount
  useEffect(() => { loadConversations(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadConversations = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/chat/conversations`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        setSavedConversations(data.conversations || []);
      }
    } catch (e) {
      console.warn('[ChatPage] load conversations failed:', e);
    }
  };

  const openSidebar = () => {
    loadConversations();
    setShowSidebar(true);
  };

  const loadConversation = async (sid) => {
    try {
      const resp = await fetch(`${API_BASE}/api/chat/conversations/${sid}`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        const msgs = (data.messages || []).map((m, i) => ({
          id: `${sid}-${i}`,
          role: m.role === 'user' ? 'user' : 'ai',
          text: m.text,
          timestamp: new Date(m.timestamp),
        }));
        setMessages([WELCOME_MESSAGE, ...msgs]);
        setCurrentSessionId(sid);
        setShowSidebar(false);
      }
    } catch (e) {
      console.warn('[ChatPage] load conversation failed:', e);
    }
  };

  const handleDeleteConversation = async (e, sid) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await fetch(`${API_BASE}/api/chat/conversations/${sid}`, { method: 'DELETE', credentials: 'include' });
      if (sid === currentSessionId) {
        setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
        setCurrentSessionId(null);
      }
      await loadConversations();
    } catch (e) {
      console.warn('[ChatPage] delete conversation failed:', e);
    }
  };

  const handleContextChange = (e) => {
    const courseId = e.target.value;
    if (!courseId) {
      setSelectedCourse(null);
    } else {
      const course = allCourses.find(c => String(c.courseID) === String(courseId));
      setSelectedCourse(course || null);
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const courseContext = selectedCourse
        ? { courseName: selectedCourse.courseName, courseID: selectedCourse.courseID }
        : null;
      // First message in a new session → auto-title from text
      const convTitle = currentSessionId ? null : text.slice(0, 60) + (text.length > 60 ? '…' : '');
      const { text: aiText, sessionId: newSid } = await sendChatMessage(
        text, messages, courseContext, currentSessionId, convTitle
      );
      if (!currentSessionId && newSid) setCurrentSessionId(newSid);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: aiText, timestamp: new Date() }]);
    } catch (err) {
      console.warn('[ChatPage] AI request failed:', err.message);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai',
        text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(), isError: true,
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
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const clearChat = () => {
    const confirmed = window.confirm('Clear this conversation?\n\nThis chat will be deleted and a new conversation will start.');
    if (!confirmed) return;
    if (currentSessionId) {
      fetch(`${API_BASE}/api/chat/conversations/${currentSessionId}`, { method: 'DELETE', credentials: 'include' })
        .then(() => loadConversations())
        .catch(() => {});
    }
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setCurrentSessionId(null);
  };

  const sendQuickPrompt = (promptText) => {
    setInputText(promptText);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <>
    <div className="chat-container">

      {/* ── Sidebar overlay ── */}
      {showSidebar && (
        <div className="chat-sidebar-overlay" onClick={() => setShowSidebar(false)}>
          <div className="chat-sidebar" onClick={e => e.stopPropagation()}>
            <div className="chat-sidebar-header">
              <span className="chat-sidebar-title">💬 Chat History</span>
              <button className="chat-sidebar-close" onClick={() => setShowSidebar(false)}>
                <IoMdClose size={22} />
              </button>
            </div>

            <button
              className="new-chat-btn"
              onClick={() => {
                setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
                setCurrentSessionId(null);
                setShowSidebar(false);
              }}
            >
              + New Chat
            </button>

            <div className="conv-list">
              {savedConversations.length === 0 ? (
                <div className="conv-empty">No saved conversations yet.</div>
              ) : (
                savedConversations.map(conv => (
                  <div
                    key={conv.sessionId}
                    className={`conversation-item ${conv.sessionId === currentSessionId ? 'conv-active' : ''}`}
                    onClick={() => loadConversation(conv.sessionId)}
                  >
                    <div className="conv-info">
                      <span className="conv-title">{conv.title}</span>
                      <span className="conv-meta">
                        {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}
                        {conv.lastMessageAt ? ` · ${new Date(conv.lastMessageAt).toLocaleDateString()}` : ''}
                      </span>
                    </div>
                    <button
                      className="conv-delete"
                      title="Delete conversation"
                      onClick={e => handleDeleteConversation(e, conv.sessionId)}
                    >
                      <IoMdTrash size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <div className="chat-navbar">
        <div className="chat-nav-left">
          <button className="chat-nav-btn" onClick={openSidebar} title="Chat history">
            <IoMdMenu size={24} />
          </button>
          <button className="chat-nav-btn" onClick={() => navigate('/dashboard')} title="Back to dashboard">
            <MdArrowBack size={24} />
          </button>
        </div>

        <div className="chat-nav-center">
          <div className="chat-nav-avatar">
            <RiRobot2Fill size={18} color="white" />
          </div>
          <div className="chat-nav-info">
            <h3>AI Study Assistant</h3>
            <span className="chat-online-dot">● Gemini 2.5 Flash</span>
          </div>
        </div>

        <div className="chat-nav-actions">
          <button className="chat-nav-btn" onClick={clearChat} title="Clear chat">
            <MdDeleteSweep size={22} />
          </button>
        </div>
      </div>

      {/* ── Context Bar: single centered course dropdown ── */}
      <div className="chat-context-bar">
        <select
          className="chat-context-select"
          value={selectedCourse?.courseID || ''}
          onChange={handleContextChange}
        >
          <option value="">💬 General chat</option>
          {allCourses.map(c => (
            <option key={c.courseID} value={c.courseID}>📚 {c.courseName}</option>
          ))}
        </select>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={msg.id}>
            {index === 0 && (
              <div className="chat-date-separator"><span>Today</span></div>
            )}
            {index === 1 && msg.fromHistory && (
              <div className="chat-date-separator chat-history-separator">
                <span>Previous conversations</span>
              </div>
            )}
            {index > 1 && !msg.fromHistory && messages[index - 1]?.fromHistory && (
              <div className="chat-date-separator"><span>New</span></div>
            )}

            {msg.role === 'system' ? (
              <div className="message-row message-row-system">
                <div className="message-bubble system-bubble">{msg.text}</div>
              </div>
            ) : (
              <div className={`message-row ${msg.role === 'user' ? 'message-row-user' : 'message-row-ai'}`}>
                {msg.role === 'ai' && (
                  <div className="msg-avatar ai-msg-avatar">
                    <RiRobot2Fill size={14} color="white" />
                  </div>
                )}

                <div className={`message-bubble ${
                  msg.role === 'user' ? 'user-bubble'
                  : msg.isError ? 'error-bubble'
                  : 'ai-bubble'
                }`}>
                  <div className="message-text">
                    {msg.role === 'ai' && !msg.isError ? renderMarkdown(msg.text) : msg.text}
                  </div>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>

                {msg.role === 'user' && (
                  <div className="msg-avatar user-msg-avatar">
                    <FaUserCircle size={28} color="#667eea" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="message-row message-row-ai">
            <div className="msg-avatar ai-msg-avatar">
              <RiRobot2Fill size={14} color="white" />
            </div>
            <div className="message-bubble ai-bubble typing-bubble">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="chat-input-area">
        {/* Quick prompts — anchored above text input */}
        <div className="quick-prompts">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.label}
              className="quick-prompt-chip"
              onClick={() => sendQuickPrompt(p.text)}
              disabled={isTyping}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={selectedCourse ? `Ask about ${selectedCourse.courseName}…` : 'Ask me anything…'}
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

      {/* ── Bottom Nav ── */}
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
