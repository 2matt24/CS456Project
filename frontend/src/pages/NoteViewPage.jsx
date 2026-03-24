import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoMdAdd, IoMdSend } from 'react-icons/io';
import {
  MdArrowBack, MdCalendarToday, MdHome, MdChat, MdSettings, MdAutoAwesome,
} from 'react-icons/md';
import { RiRobot2Fill } from 'react-icons/ri';
import { FaUserCircle } from 'react-icons/fa';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { notesAPI } from '../services/api';
import AddModal from '../components/AddModal';
import '../styles/NoteViewPage.css';

/* ─── Gemini config ─── */
const GEMINI_API_KEY = 'AIzaSyCBQY2vauQ-zEcelbpkIaU2deSx0WBENR4';
const GEMINI_MODEL   = 'gemini-2.5-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(userMessage, history, note) {
  const systemText =
    `You are a helpful study assistant reviewing the following note titled "${note.title}".\n\n` +
    `Note content:\n${note.content}\n\n` +
    'Answer questions about this note concisely and helpfully. ' +
    'Use bullet points where appropriate. Keep responses under 300 words unless asked for more.';

  const contents = history
    .filter((m) => m.id !== 'welcome')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response');
  return text;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════ */
export default function NoteViewPage() {
  const navigate = useNavigate();
  const { courseId, noteId } = useParams();

  const [note, setNote]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  /* AI summary */
  const [summary, setSummary]           = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError]   = useState('');

  /* AI chat */
  const [messages, setMessages]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const messagesEndRef            = useRef(null);
  const textareaRef               = useRef(null);

  useEffect(() => { loadNote(); }, [courseId, noteId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const loadNote = async () => {
    try {
      const notes = await notesAPI.getForCourse(courseId);
      const found = notes.find((n) => n.noteID === parseInt(noteId));
      if (found) {
        setNote(found);
        setMessages([{
          id: 'welcome',
          role: 'ai',
          text: `📖 I've loaded "${found.title}". Ask me anything about it — I can summarize sections, explain concepts, or quiz you!`,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      console.error('[NoteViewPage] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── AI Summarize ── */
  const handleSummarize = async () => {
    if (!note?.content) return;
    setIsSummarizing(true);
    setSummaryError('');
    setSummary('');

    try {
      // Try backend first (n8n workflow)
      const resp = await fetch('https://cs456project.onrender.com/api/notes/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: note.content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSummary(data.summary || '');
        return;
      }
    } catch (e) {
      console.warn('[NoteViewPage] backend summarize failed, falling back to Gemini:', e);
    }

    // Fallback: Gemini client-side
    try {
      const result = await callGemini(
        'Please provide a comprehensive summary of these notes in bullet points.',
        [],
        note,
      );
      setSummary(result);
    } catch (err) {
      setSummaryError('Could not generate summary. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  /* ── Chat send ── */
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping || !note) return;

    const userMsg = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const aiText = await callGemini(text, messages, note);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: aiText, timestamp: new Date() }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, role: 'ai',
        text: "I'm having trouble right now. Please try again!",
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
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };

  /* ── Loading / not found ── */
  if (isLoading) {
    return (
      <div className="note-view-container">
        <div className="nv-navbar">
          <button className="nv-nav-btn" onClick={() => navigate(`/course/${courseId}`)}>
            <MdArrowBack size={22} />
          </button>
          <h3>Note</h3>
          <div style={{ width: 38 }} />
        </div>
        <p className="note-view-loading">Loading note…</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="note-view-container">
        <div className="nv-navbar">
          <button className="nv-nav-btn" onClick={() => navigate(`/course/${courseId}`)}>
            <MdArrowBack size={22} />
          </button>
          <h3>Note</h3>
          <div style={{ width: 38 }} />
        </div>
        <p className="note-view-loading">Note not found.</p>
      </div>
    );
  }

  return (
    <>
    <div className="note-view-container">

      {/* ── Navbar ── */}
      <div className="nv-navbar">
        <button className="nv-nav-btn" onClick={() => navigate(`/course/${courseId}`)}>
          <MdArrowBack size={22} />
        </button>
        <h3 className="nv-navbar-title">Note</h3>
        <button
          className={`nv-summarize-nav-btn ${isSummarizing ? 'loading' : ''}`}
          onClick={handleSummarize}
          disabled={isSummarizing || !note.content}
          title="AI Summarize"
        >
          {isSummarizing ? <span className="nv-spin" /> : <MdAutoAwesome size={20} />}
        </button>
      </div>

      <div className="note-view-content">

        {/* ── Note Header ── */}
        <div className="note-view-header">
          <div className="note-view-icon">
            <IoDocumentTextOutline size={36} color="#667eea" />
          </div>
          <h2 className="note-view-title">{note.title}</h2>
          <p className="note-view-date">
            {new Date(note.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
          {note.fileName && <p className="note-view-filename">📎 {note.fileName}</p>}
        </div>

        {/* ── AI Summary ── */}
        {(summary || summaryError) && (
          <div className="nv-summary-card">
            <div className="nv-summary-header">
              <MdAutoAwesome size={16} color="#667eea" />
              <span>AI Summary</span>
            </div>
            {summary && <div className="nv-summary-text">{summary}</div>}
            {summaryError && <p className="nv-summary-error">{summaryError}</p>}
          </div>
        )}

        {/* ── Note Content ── */}
        {note.content ? (
          <div className="note-view-body">
            <h4>Content</h4>
            <div className="note-view-text" style={{ whiteSpace: 'pre-wrap' }}>
              {note.content}
            </div>
          </div>
        ) : (
          <div className="note-view-empty">
            <p>No text content for this note.</p>
          </div>
        )}

        {/* ── AI Chat ── */}
        <div className="nv-chat-section">
          <h4 className="nv-chat-title">
            <RiRobot2Fill size={15} />
            Ask AI About This Note
          </h4>

          <div className="nv-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`nv-msg-row ${msg.role === 'user' ? 'nv-msg-user' : 'nv-msg-ai'}`}
              >
                {msg.role === 'ai' && (
                  <div className="nv-avatar ai">
                    <RiRobot2Fill size={11} color="white" />
                  </div>
                )}
                <div className={`nv-bubble ${
                  msg.role === 'user' ? 'nv-bubble-user'
                  : msg.isError ? 'nv-bubble-error'
                  : 'nv-bubble-ai'
                }`}>
                  <p className="nv-bubble-text">{msg.text}</p>
                  <span className="nv-bubble-time">{formatTime(msg.timestamp)}</span>
                </div>
                {msg.role === 'user' && (
                  <div className="nv-avatar user">
                    <FaUserCircle size={20} color="#667eea" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="nv-msg-row nv-msg-ai">
                <div className="nv-avatar ai">
                  <RiRobot2Fill size={11} color="white" />
                </div>
                <div className="nv-bubble nv-bubble-ai nv-typing-bubble">
                  <div className="nv-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="nv-input-row">
            <textarea
              ref={textareaRef}
              className="nv-textarea"
              placeholder="Ask about this note…"
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isTyping}
            />
            <button
              className={`nv-send-btn ${!inputText.trim() || isTyping ? 'disabled' : ''}`}
              onClick={handleSend}
              disabled={!inputText.trim() || isTyping}
            >
              <IoMdSend size={16} />
            </button>
          </div>
          <p className="nv-hint">Enter to send · Shift+Enter for new line</p>
        </div>

        <div style={{ height: 90 }} />
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
        <div className="nav-item" onClick={() => navigate('/chat')}>
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
