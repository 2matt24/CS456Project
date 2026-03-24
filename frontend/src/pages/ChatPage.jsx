import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd, IoMdSend } from 'react-icons/io';
import { MdCalendarToday, MdHome, MdChat, MdSettings, MdArrowBack, MdDeleteSweep } from 'react-icons/md';
import { RiRobot2Fill } from 'react-icons/ri';
import { FaUserCircle } from 'react-icons/fa';
import '../styles/ChatPage.css';

/* ─── Gemini configuration ─── */
const GEMINI_API_KEY = 'AIzaSyCBQY2vauQ-zEcelbpkIaU2deSx0WBENR4';
const GEMINI_MODEL   = 'gemini-2.5-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT =
  'You are an AI Study Assistant for StudyBuddyAI, a student productivity app. ' +
  'Help students understand course concepts, quiz them, summarize notes, suggest ' +
  'study strategies, explain complex topics clearly, and keep them motivated. ' +
  'Be concise, encouraging, and use simple language. Format answers with bullet ' +
  'points or numbered lists when helpful. Keep responses under 200 words unless ' +
  'the student explicitly asks for more detail.';

/* ─── Mock fallback responses (when Gemini is unavailable) ─── */
const MOCK_RESPONSES = [
  "I can help you study! Try asking me to summarize a topic or quiz you on your notes.",
  "Great question! Here are some study tips:\n• Break topics into small chunks\n• Use active recall instead of re-reading\n• Take breaks every 25 minutes (Pomodoro technique)\n• Review material before sleep",
  "I'd love to quiz you! Tell me which subject or topic you want to practice, and I'll ask you questions.",
  "To understand this better, try explaining the concept in your own words first — that's the best way to find gaps in your knowledge!",
  "Here's a study strategy: Create a mind map connecting key concepts. It helps your brain build associations and remember more.",
];

let mockIndex = 0;

async function callGemini(userMessage, conversationHistory) {
  // Build the contents array from conversation history
  const contents = conversationHistory
    .filter((m) => m.id !== 'welcome')          // skip the static welcome
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  // Append the new user message
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
    },
  };

  console.log('[ChatPage] Calling Gemini API, model:', GEMINI_MODEL);

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[ChatPage] Gemini error', response.status, errText);
    throw new Error(`Gemini API ${response.status}`);
  }

  const data = await response.json();
  console.log('[ChatPage] Gemini response:', data);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

/* ─── helpers ─── */
const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'ai',
  text: "👋 Hi! I'm your AI Study Assistant powered by Gemini. I can explain concepts, quiz you on any topic, summarize notes, and suggest study strategies. What would you like to work on today?",
  timestamp: new Date(),
};

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
  const [isTyping, setIsTyping]   = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const appendAiMessage = (text, isError = false) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, role: 'ai', text, timestamp: new Date(), isError },
    ]);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    // Add user message immediately
    const userMsg = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Pass the current messages array (before adding the new user message)
      // so Gemini has full conversation context
      const aiText = await callGemini(text, [...messages]);
      appendAiMessage(aiText);
    } catch (err) {
      console.warn('[ChatPage] Gemini failed, using mock response:', err.message);
      // Graceful fallback — cycle through mock responses
      const fallback = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
      mockIndex += 1;
      appendAiMessage(fallback);
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
    console.log('[ChatPage] Chat cleared');
  };

  const sendQuickPrompt = (promptText) => {
    setInputText(promptText);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
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

      {/* ── Messages ── */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={msg.id}>
            {index === 0 && (
              <div className="chat-date-separator"><span>Today</span></div>
            )}

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
                <p className="message-text">{msg.text}</p>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
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

      {/* ── Bottom Nav ── */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/dashboard')}><IoMdAdd size={28} /></div>
        <div className="nav-item" onClick={() => navigate('/calendar')}><MdCalendarToday size={24} /></div>
        <div className="nav-item" onClick={() => navigate('/dashboard')}><MdHome size={26} /></div>
        <div className="nav-item active"><MdChat size={24} /></div>
        <div className="nav-item" onClick={() => navigate('/settings')}><MdSettings size={26} /></div>
      </div>
    </div>
  );
}

export default ChatPage;
