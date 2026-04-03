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

/* ── Simple markdown renderer (no external lib needed) ── */
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

async function sendChatMessage(userMessage, history, noteContext, fileContext) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message:     userMessage,
      history:     history.filter((m) => m.id !== 'welcome' && m.role !== 'system'),
      noteContext: noteContext ? { title: noteContext.title, content: noteContext.content } : null,
      noteId:      noteContext?.noteID || null,
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
  text: "👋 Hi! I'm your AI Study Assistant powered by Gemini. I can explain concepts, quiz you on any topic, summarize notes, and suggest study strategies. What would you like to work on today?",
  timestamp: new Date(),
};

function formatTime(date) {
  // Ensure UTC timestamps from the backend (no timezone suffix) are parsed as UTC
  const d = typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')
    ? new Date(date + 'Z')
    : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const QUICK_PROMPTS = [
  { label: '📝 Summarize my latest notes', text: 'Help me summarize key concepts from my recent study session.' },
  { label: '🧠 Quiz me on a topic',         text: 'Quiz me on a topic of your choice — ask me 3 questions one at a time.' },
  { label: '💡 Give me study tips',          text: 'Give me your best evidence-based study tips for retaining information.' },
  { label: '🔍 Explain a concept',           text: 'Explain a difficult concept simply, as if I were new to the subject.' },
];

/* ════════════════════════════════════
   Component
════════════════════════════════════ */
function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages]   = useState([WELCOME_MESSAGE]);
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

  const sendQuickPrompt = (promptText) => {
    setInputText(promptText);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <>
    <div className="chat-container">

      {/* ── Navbar ── */}
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
            <span className="chat-online-dot">● Gemini 2.5 Flash</span>
          </div>
        </div>

        <button className="chat-nav-btn" onClick={clearChat} title="Clear chat">
          <MdDeleteSweep size={24} />
        </button>
      </div>

      {/* ── Context Bar: Note Selector ── */}
      <div className="chat-context-bar">
        <select
          className="chat-note-select"
          value={selectedNote?.noteID || ''}
          onChange={(e) => {
            const note = allNotes.find((n) => n.noteID === parseInt(e.target.value));
            setSelectedNote(note || null);
            if (note) {
              setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'system',
                text: `📚 Now chatting about: "${note.title}"${note.courseName ? ` · ${note.courseName}` : ''}`,
                timestamp: new Date(),
              }]);
            } else {
              setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'system',
                text: '💬 Switched to general chat',
                timestamp: new Date(),
              }]);
            }
          }}
        >
          <option value="">💬 General chat</option>
          {allNotes.map((n) => (
            <option key={n.noteID} value={n.noteID}>
              📝 {n.title}{n.courseName ? ` (${n.courseName})` : ''}
            </option>
          ))}
        </select>

        {selectedNote && (
          <div className="chat-context-indicator">
            <span className="context-label">📚 {selectedNote.title}</span>
            <button
              className="chat-clear-context-btn"
              onClick={() => {
                setSelectedNote(null);
                setMessages(prev => [...prev, {
                  id: Date.now(),
                  role: 'system',
                  text: '💬 Switched to general chat',
                  timestamp: new Date(),
                }]);
              }}
            >✕</button>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={msg.id}>
            {/* "Today" separator at the very top */}
            {index === 0 && (
              <div className="chat-date-separator"><span>Today</span></div>
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

            <div className={`message-row ${
              msg.role === 'user' ? 'message-row-user'
              : msg.role === 'system' ? 'message-row-system'
              : 'message-row-ai'
            }`}>
              {msg.role === 'ai' && (
                <div className="msg-avatar ai-msg-avatar">
                  <RiRobot2Fill size={14} color="white" />
                </div>
              )}

              <div className={`message-bubble ${
                msg.role === 'user' ? 'user-bubble'
                : msg.role === 'system' ? 'system-bubble'
                : msg.isError ? 'error-bubble'
                : 'ai-bubble'
              }`}>
                <div className="message-text">
                  {msg.role === 'ai' && !msg.isError ? renderMarkdown(msg.text) : msg.text}
                </div>
                {msg.role !== 'system' && (
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="msg-avatar user-msg-avatar">
                  <FaUserCircle size={28} color="#667eea" />
                </div>
              )}
            </div>

            {/* Quick-prompt chips after the welcome message */}
            {index === 0 && (
              <div className="quick-prompts">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    className="quick-prompt-chip"
                    onClick={() => sendQuickPrompt(p.text)}
                  >
                    {p.label}
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
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="chat-input-area">
        {fileName && (
          <div className="chat-file-chip">
            <IoMdAttach size={14} />
            <span>{fileName.length > 28 ? fileName.slice(0, 28) + '…' : fileName}</span>
            <button className="chat-file-chip-remove" onClick={() => { setFileContext(null); setFileName(''); }}>✕</button>
          </div>
        )}
        <div className="chat-input-row">
          <label className="chat-attach-btn" title="Attach a file for context">
            <IoMdAttach size={20} />
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.docx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>
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
