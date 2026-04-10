import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdSend, IoMdAttach, IoMdBookmark, IoMdMenu, IoMdClose, IoMdTrash } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdArrowBack, MdDeleteSweep } from 'react-icons/md';
import { RiRobot2Fill } from 'react-icons/ri';
import { FaUserCircle } from 'react-icons/fa';
import AddModal from '../components/AddModal';
import { notesAPI, chatAPI } from '../services/api';
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

async function sendChatMessage(userMessage, history, noteContext, fileContext, sessionId, conversationTitle) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      message:           userMessage,
      history:           history.filter(m => m.id !== 'welcome' && m.role !== 'system'),
      noteContext:       noteContext ? { noteID: noteContext.noteID, title: noteContext.title, content: noteContext.content } : null,
      fileContext:       fileContext || null,
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

  // Courses + notes for context selector
  const [allCourses, setAllCourses]         = useState([]);
  const [allNotes, setAllNotes]             = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedNote, setSelectedNote]     = useState(null);

  // File context
  const [fileContext, setFileContext] = useState(null);
  const [fileName, setFileName]       = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const fileInputRef   = useRef(null);

  // Notes filtered by selected course
  const filteredNotes = selectedCourseId
    ? allNotes.filter(n => String(n.courseID) === String(selectedCourseId))
    : allNotes;

  // Load courses + notes + history on mount
  useEffect(() => {
    (async () => {
      try {
        const coursesResp = await fetch(`${API_BASE}/api/courses`, { credentials: 'include' });
        if (coursesResp.ok) {
          const coursesData = await coursesResp.json();
          const courses = coursesData.courses || [];
          setAllCourses(courses);
          const noteArrays = await Promise.all(courses.map(c => notesAPI.getForCourse(c.courseID)));
          const flat = [];
          courses.forEach((course, ci) => {
            (noteArrays[ci] || []).forEach(n => flat.push({ ...n, courseName: course.courseName }));
          });
          setAllNotes(flat);
        }
      } catch (e) {
        console.warn('[ChatPage] data load failed:', e);
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

  // Sidebar / conversation history
  const [showSidebar, setShowSidebar]               = useState(false);
  const [savedConversations, setSavedConversations] = useState([]);
  const [currentSessionId, setCurrentSessionId]     = useState(null);

  const [isUploadingFile, setIsUploadingFile] = useState(false);

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
        setSelectedNote(null);
        setFileContext(null);
        setFileName('');
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    const ext = file.name.split('.').pop().toLowerCase();
    const textTypes = ['txt', 'md', 'csv'];

    if (textTypes.includes(ext)) {
      // Plain text — read directly in browser
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => setFileContext(ev.target.result);
      reader.readAsText(file);
      return;
    }

    // PDF / DOCX — send to backend for extraction
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      alert('Supported file types: .txt, .md, .pdf, .docx');
      return;
    }

    setIsUploadingFile(true);
    setFileName(file.name);

    try {
      const formData = new FormData();
      // Re-use the notes upload endpoint just for text extraction
      // We pass a dummy courseId; the backend extracts text and returns content
      formData.append('file', file);
      formData.append('courseId', '0');        // backend validates ownership but we only need the text
      formData.append('title', file.name);
      formData.append('extractOnly', 'true');  // hint to backend (won't break if ignored)

      const response = await fetch(`${API_BASE}/api/chat/extract-file`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setFileContext(data.text || '');
        if (!data.text) {
          alert('Could not extract text from this file. Try copy-pasting the content instead.');
          setFileName('');
        }
      } else {
        // Fallback: guide user to use note dropdown instead
        setFileName('');
        setFileContext(null);
        alert(`Could not process "${file.name}".\n\nTip: Upload this file as a note first, then select it from the note dropdown above to chat about it.`);
      }
    } catch (err) {
      console.error('[ChatPage] file extract error:', err);
      setFileName('');
      setFileContext(null);
      alert('Upload failed. Try uploading this file as a note, then select it from the note dropdown above.');
    } finally {
      setIsUploadingFile(false);
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
      const noteContext = selectedNote
        ? { noteID: selectedNote.noteID, title: selectedNote.title, content: selectedNote.content }
        : null;
      // First message in a new session → auto-title from text
      const convTitle = currentSessionId ? null : text.slice(0, 60) + (text.length > 60 ? '…' : '');
      const { text: aiText, sessionId: newSid } = await sendChatMessage(
        text, messages, noteContext, fileContext, currentSessionId, convTitle
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
    const confirmed = window.confirm('Clear this conversation?\n\nYour chat history will be deleted and a new conversation will start.');
    if (!confirmed) return;
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setCurrentSessionId(null);
    chatAPI.clearHistory();
  };

  const saveChat = () => {
    alert('✓ Your conversation is automatically saved.\n\nUse "Clear chat" to start a fresh conversation anytime.');
  };

  const sendQuickPrompt = (promptText) => {
    setInputText(promptText);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleNoteSelect = (e) => {
    const note = allNotes.find(n => n.noteID === parseInt(e.target.value));
    setSelectedNote(note || null);
    if (note) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'system',
        text: `📚 Now chatting about: "${note.title}"`,
        timestamp: new Date(),
      }]);
    }
  };

  const clearNoteContext = () => {
    setSelectedNote(null);
    setMessages(prev => [...prev, {
      id: Date.now(), role: 'system',
      text: '💬 Switched to general chat',
      timestamp: new Date(),
    }]);
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
                setSelectedNote(null);
                setFileContext(null);
                setFileName('');
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
                      {conv.noteTitle && (
                        <span className="conv-note-tag">📝 {conv.noteTitle}</span>
                      )}
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

      {/* ── Context Bar: Course → Note selectors ── */}
      <div className="chat-context-bar">
        <div className="chat-context-selectors">
          <select
            className="chat-course-select"
            value={selectedCourseId}
            onChange={e => {
              setSelectedCourseId(e.target.value);
              setSelectedNote(null);
            }}
          >
            <option value="">📚 All courses</option>
            {allCourses.map(c => (
              <option key={c.courseID} value={c.courseID}>{c.courseName}</option>
            ))}
          </select>

          <select
            className="chat-note-select"
            value={selectedNote?.noteID || ''}
            onChange={handleNoteSelect}
          >
            <option value="">💬 General chat</option>
            {filteredNotes.map(n => (
              <option key={n.noteID} value={n.noteID}>
                📝 {n.title}{!selectedCourseId && n.courseName ? ` (${n.courseName})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedNote && (
          <button className="chat-clear-context-btn" onClick={clearNoteContext} title="Clear note context">✕</button>
        )}
      </div>

      {/* ── Active note context strip ── */}
      {selectedNote && (
        <div className="chat-active-context">
          <span>📝</span>
          <span className="chat-context-text">Chatting about: <strong>{selectedNote.title}</strong></span>
        </div>
      )}

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
        {fileName && (
          <div className="chat-file-chip">
            {isUploadingFile ? <span className="chip-spinner" /> : <IoMdAttach size={14} />}
            <span>{isUploadingFile ? 'Extracting text…' : (fileName.length > 32 ? fileName.slice(0, 32) + '…' : fileName)}</span>
            {!isUploadingFile && (
              <button className="chat-file-chip-remove" onClick={() => { setFileContext(null); setFileName(''); }}>✕</button>
            )}
          </div>
        )}

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
            placeholder={selectedNote ? `Ask about "${selectedNote.title}"…` : 'Ask me anything about your studies…'}
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
