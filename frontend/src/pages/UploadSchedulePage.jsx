import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd } from 'react-icons/io';
import {
  MdArrowBack, MdCalendarToday, MdHome, MdChat, MdSettings,
  MdCloudUpload, MdEdit, MdSmartToy, MdCheckCircle, MdAdd, MdDelete
} from 'react-icons/md';
import '../styles/UploadSchedulePage.css';

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#ff6b6b'];
const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TODAY = new Date().toISOString().split('T')[0];

const TYPE_LABELS = {
  school: 'School / Class',
  work: 'Work / Job',
  personal: 'Personal / Other',
};

const EVENT_LABELS = {
  school:   { singular: 'Class',    plural: 'Classes',    example: 'e.g. CS201 Lecture' },
  work:     { singular: 'Shift',    plural: 'Shifts',     example: 'e.g. Morning Shift' },
  personal: { singular: 'Activity', plural: 'Activities', example: 'e.g. Gym Session' },
};

function newEvent(id = Date.now()) {
  return {
    id,
    name: '',
    location: '',
    repeat: 'Once',
    days: [],
    startTime: '',
    endTime: '',
    startDate: '',
    endDate: '',
    color: '#667eea',
  };
}

export default function UploadSchedulePage() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState(1);
  const [scheduleType, setScheduleType] = useState(null);
  const [uploadMethod, setUploadMethod] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [aiText, setAiText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [events, setEvents] = useState([newEvent()]);
  const [extractedEvents, setExtractedEvents] = useState([]);

  const typeLabel = scheduleType ? TYPE_LABELS[scheduleType] : '';
  const labels = scheduleType ? EVENT_LABELS[scheduleType] : { singular: 'Event', plural: 'Events', example: 'e.g. Add an event' };

  async function handleProcessFile() {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setExtractedEvents([]);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('scheduleType', scheduleType);

      const response = await fetch('https://cs456project.onrender.com/api/schedules/extract', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error ${response.status}`);
      }

      const data = await response.json();
      setExtractedEvents(data.events || []);

      if (!data.events || data.events.length === 0) {
        alert('No events found in file. Please try manual entry or a different file.');
      }
    } catch (error) {
      console.error('File extraction error:', error);
      alert(`Failed to extract schedule: ${error.message}\nPlease try manual entry.`);
      setExtractedEvents([]);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleProcessAI() {
    if (!aiText.trim()) return;

    setIsProcessing(true);
    setExtractedEvents([]);

    try {
      const response = await fetch('https://cs456project.onrender.com/api/schedules/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: aiText,
          scheduleType: scheduleType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error ${response.status}`);
      }

      const data = await response.json();
      setExtractedEvents(data.events || []);

      if (!data.events || data.events.length === 0) {
        alert('Could not extract events from text. Please check formatting and try again.');
      }
    } catch (error) {
      console.error('AI parsing error:', error);
      alert(`Failed to parse schedule: ${error.message}\nPlease try manual entry.`);
      setExtractedEvents([]);
    } finally {
      setIsProcessing(false);
    }
  }

  function updateEvent(id, field, value) {
    setEvents(prev =>
      prev.map(ev => (ev.id === id ? { ...ev, [field]: value } : ev))
    );
  }

  async function handleSaveSchedule() {
    const eventsToSave = extractedEvents.length > 0 ? extractedEvents : events;

    if (eventsToSave.length === 0) {
      alert('No events to save. Please add at least one event.');
      return;
    }

    // Validate manual events
    if (extractedEvents.length === 0) {
      const invalid = events.find(ev =>
        !ev.name.trim() ||
        !ev.startTime ||
        !ev.endTime ||
        !ev.startDate ||
        (ev.repeat === 'Weekly' && ev.days.length === 0)
      );
      if (invalid) {
        alert('Please fill in all required fields: name, times, start date, and days (for weekly events).');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const response = await fetch('https://cs456project.onrender.com/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          scheduleType: scheduleType,
          events: eventsToSave.map(ev => ({
            title: ev.name || ev.title,
            location: ev.location || '',
            type: scheduleType,
            color: ev.color || '#667eea',
            repeat: (ev.repeat || 'once').toLowerCase(),
            days: Array.isArray(ev.days) ? ev.days : (ev.days ? ev.days.split(', ') : []),
            startTime: ev.startTime || ev.time?.split(' - ')[0] || '09:00',
            endTime: ev.endTime || ev.time?.split(' - ')[1] || '10:00',
            startDate: ev.startDate || new Date().toISOString().split('T')[0],
            endDate: ev.endDate || null,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save schedule');
      }

      const result = await response.json();
      alert(`✓ Schedule saved successfully!${result.coursesCreated ? ` ${result.coursesCreated} courses created.` : ''}`);

      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      console.error('Save schedule error:', error);
      alert(`Failed to save schedule: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  function toggleDay(id, day) {
    setEvents(prev =>
      prev.map(ev => {
        if (ev.id !== id) return ev;
        const days = ev.days.includes(day)
          ? ev.days.filter(d => d !== day)
          : [...ev.days, day];
        return { ...ev, days };
      })
    );
  }

  function addEvent() {
    setEvents(prev => [...prev, newEvent(Date.now())]);
  }

  function deleteEvent(id) {
    setEvents(prev => prev.filter(ev => ev.id !== id));
  }

  const BottomNav = () => (
    <div className="bottom-nav">
      <div className="nav-item" onClick={() => navigate('/dashboard')}>
        <IoMdAdd size={28} />
      </div>
      <div className="nav-item active">
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
  );

  const ExtractedEventsList = () => (
    <div className="usp-extracted-list">
      <h4 className="usp-extracted-title">
        {uploadMethod === 'ai'
          ? `Found ${extractedEvents.length} ${extractedEvents.length === 1 ? labels.singular : labels.plural}`
          : `Extracted ${labels.plural}`}
      </h4>
      {extractedEvents.map((ev, i) => (
        <div key={i} className="usp-extracted-item">
          <div className="usp-event-color-dot" style={{ background: ev.color }} />
          <div>
            <p className="usp-event-name">{ev.name}</p>
            <p className="usp-event-time">{ev.startTime} – {ev.endTime} &bull; {Array.isArray(ev.days) ? ev.days.join(', ') : ev.days}</p>
          </div>
        </div>
      ))}
      <button
        className="usp-save-btn"
        onClick={handleSaveSchedule}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <><span className="btn-spinner" /> Saving…</>
        ) : (
          <><MdCheckCircle size={18} /> Save Schedule</>
        )}
      </button>
    </div>
  );

  // Screen 1 — Schedule Type Selection
  if (screen === 1) {
    return (
      <div className="usp-container">
        <div className="usp-navbar">
          <button className="usp-nav-btn" onClick={() => navigate('/dashboard')}>
            <MdArrowBack size={22} />
          </button>
          <h3>Add Schedule</h3>
          <div style={{ width: 38 }} />
        </div>

        <div className="usp-body">
          <p className="usp-subtitle">Select Schedule Type</p>

          <div className="usp-type-grid">
            <button
              className="usp-type-card"
              onClick={() => { setScheduleType('school'); setScreen(2); }}
            >
              <span className="usp-type-icon">🎓</span>
              <span className="usp-type-label">School / Class</span>
              <span className="usp-type-sub">Course Schedules &amp; Exams</span>
            </button>

            <button
              className="usp-type-card"
              onClick={() => { setScheduleType('work'); setScreen(2); }}
            >
              <span className="usp-type-icon">💼</span>
              <span className="usp-type-label">Work / Job</span>
              <span className="usp-type-sub">Work Shifts &amp; Meetings</span>
            </button>

            <button
              className="usp-type-card"
              onClick={() => { setScheduleType('personal'); setScreen(2); }}
            >
              <span className="usp-type-icon">🏃</span>
              <span className="usp-type-label">Personal / Other</span>
              <span className="usp-type-sub">Fitness, Hobbies, Etc.</span>
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // Screen 2 — Upload Method
  if (screen === 2) {
    return (
      <div className="usp-container">
        <div className="usp-navbar">
          <button className="usp-nav-btn" onClick={() => setScreen(1)}>
            <MdArrowBack size={22} />
          </button>
          <h3>{typeLabel}</h3>
          <div style={{ width: 38 }} />
        </div>

        <div className="usp-body">
          <p className="usp-subtitle">Selecting Uploading Method</p>

          <div className="usp-method-list">
            <button
              className="usp-method-card"
              onClick={() => {
                setUploadMethod('file');
                setExtractedEvents([]);
                setUploadedFile(null);
                setScreen(3);
              }}
            >
              <div className="usp-method-icon"><MdCloudUpload size={28} /></div>
              <div className="usp-method-text">
                <span className="usp-method-label">Upload File</span>
                <span className="usp-method-sub">PDF, Image, or iCal (.ics)</span>
              </div>
            </button>

            <div className="usp-or-divider"><span>OR</span></div>

            <button
              className="usp-method-card"
              onClick={() => {
                setUploadMethod('manual');
                setEvents([newEvent()]);
                setScreen(3);
              }}
            >
              <div className="usp-method-icon"><MdEdit size={28} /></div>
              <div className="usp-method-text">
                <span className="usp-method-label">Enter Manually</span>
                <span className="usp-method-sub">Add Events One At A Time</span>
              </div>
            </button>

            <div className="usp-or-divider"><span>OR</span></div>

            <button
              className="usp-method-card"
              onClick={() => {
                setUploadMethod('ai');
                setAiText('');
                setExtractedEvents([]);
                setScreen(3);
              }}
            >
              <div className="usp-method-icon"><MdSmartToy size={28} /></div>
              <div className="usp-method-text">
                <span className="usp-method-label">AI Extract</span>
                <span className="usp-method-sub">Paste Text For AI Parsing</span>
              </div>
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  // Screen 3 — File Upload
  if (screen === 3 && uploadMethod === 'file') {
    return (
      <div className="usp-container">
        <div className="usp-navbar">
          <button className="usp-nav-btn" onClick={() => setScreen(2)}>
            <MdArrowBack size={22} />
          </button>
          <h3>Upload File</h3>
          <div style={{ width: 38 }} />
        </div>

        <div className="usp-body">
          <div
            className={`usp-dropzone${dragOver ? ' drag-over' : ''}${uploadedFile ? ' has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) { setUploadedFile(f); setExtractedEvents([]); }
            }}
            onClick={() => document.getElementById('usp-file-input').click()}
          >
            {uploadedFile ? (
              <div className="usp-file-preview">
                <MdCheckCircle size={44} color="#43e97b" />
                <p className="usp-file-name">{uploadedFile.name}</p>
                <p className="usp-file-size">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                <button
                  className="usp-change-file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                    setExtractedEvents([]);
                  }}
                >
                  Change file
                </button>
              </div>
            ) : (
              <>
                <MdCloudUpload size={52} color="#667eea" />
                <p className="usp-drop-title">Drag &amp; Drop Your File Here</p>
                <p className="usp-drop-sub">or click to browse</p>
                <p className="usp-drop-hint">PDF, PNG, JPG, or .ics supported</p>
              </>
            )}
          </div>

          <input
            id="usp-file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.ics"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files[0]) {
                setUploadedFile(e.target.files[0]);
                setExtractedEvents([]);
              }
            }}
          />

          {uploadedFile && !isProcessing && extractedEvents.length === 0 && (
            <button className="usp-process-btn" onClick={handleProcessFile}>
              <MdSmartToy size={20} /> Extract with AI
            </button>
          )}

          {isProcessing && (
            <div className="usp-processing">
              <div className="usp-spinner" />
              <p>AI is analyzing your schedule…</p>
            </div>
          )}

          {extractedEvents.length > 0 && <ExtractedEventsList />}
        </div>

        <BottomNav />
      </div>
    );
  }

  // Screen 3 — Manual Entry
  if (screen === 3 && uploadMethod === 'manual') {
    return (
      <div className="usp-container">
        <div className="usp-navbar">
          <button className="usp-nav-btn" onClick={() => setScreen(2)}>
            <MdArrowBack size={22} />
          </button>
          <h3>Enter Manually</h3>
          <div style={{ width: 38 }} />
        </div>

        <div className="usp-body">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="usp-event-form-card"
              style={{ borderLeftColor: ev.color }}
            >
              <div className="usp-form-group">
                <label className="usp-form-label">{labels.singular.toUpperCase()} NAME *</label>
                <input
                  className="usp-form-input"
                  type="text"
                  placeholder={labels.example}
                  value={ev.name}
                  onChange={(e) => updateEvent(ev.id, 'name', e.target.value)}
                />
              </div>

              <div className="usp-form-group">
                <label className="usp-form-label">LOCATION (OPTIONAL)</label>
                <input
                  className="usp-form-input"
                  type="text"
                  placeholder="e.g. Room 204, Engineering Bldg"
                  value={ev.location}
                  onChange={(e) => updateEvent(ev.id, 'location', e.target.value)}
                />
              </div>

              <div className="usp-form-group">
                <label className="usp-form-label">REPEAT</label>
                <select
                  className="usp-form-select"
                  value={ev.repeat}
                  onChange={(e) => updateEvent(ev.id, 'repeat', e.target.value)}
                >
                  <option value="Once">Once</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div className="usp-form-group">
                <label className="usp-form-label">DAYS</label>
                <div className="usp-days-row">
                  {DAYS_SHORT.map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`usp-day-chip${ev.days.includes(DAYS_FULL[i]) ? ' active' : ''}`}
                      onClick={() => toggleDay(ev.id, DAYS_FULL[i])}
                      title={DAYS_FULL[i]}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="usp-form-row">
                <div className="usp-form-group">
                  <label className="usp-form-label">START TIME</label>
                  <input
                    className="usp-form-input"
                    type="time"
                    value={ev.startTime}
                    onChange={(e) => updateEvent(ev.id, 'startTime', e.target.value)}
                  />
                </div>
                <div className="usp-form-group">
                  <label className="usp-form-label">END TIME</label>
                  <input
                    className="usp-form-input"
                    type="time"
                    value={ev.endTime}
                    onChange={(e) => updateEvent(ev.id, 'endTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="usp-form-row">
                <div className="usp-form-group">
                  <label className="usp-form-label">START DATE</label>
                  <input
                    className="usp-form-input"
                    type="date"
                    value={ev.startDate}
                    onChange={(e) => updateEvent(ev.id, 'startDate', e.target.value)}
                  />
                </div>
                <div className="usp-form-group">
                  <label className="usp-form-label">END DATE</label>
                  <input
                    className="usp-form-input"
                    type="date"
                    value={ev.endDate}
                    onChange={(e) => updateEvent(ev.id, 'endDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="usp-form-group">
                <label className="usp-form-label">COLOR</label>
                <div className="usp-color-row">
                  {COLORS.map((c) => (
                    <div
                      key={c}
                      className={`usp-color-dot${ev.color === c ? ' selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => updateEvent(ev.id, 'color', c)}
                    />
                  ))}
                </div>
              </div>

              {events.length > 1 && (
                <button
                  type="button"
                  className="usp-delete-event-btn"
                  onClick={() => deleteEvent(ev.id)}
                >
                  <MdDelete size={14} /> Remove {labels.singular}
                </button>
              )}
            </div>
          ))}

          <button type="button" className="usp-add-event-btn" onClick={addEvent}>
            <MdAdd size={18} /> Add Another {labels.singular}
          </button>

          <button
            className="usp-save-btn"
            type="button"
            onClick={handleSaveSchedule}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <><span className="btn-spinner" /> Saving…</>
            ) : (
              <><MdCheckCircle size={18} /> Save Schedule</>
            )}
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  // Screen 3 — AI Extract
  if (screen === 3 && uploadMethod === 'ai') {
    return (
      <div className="usp-container">
        <div className="usp-navbar">
          <button className="usp-nav-btn" onClick={() => setScreen(2)}>
            <MdArrowBack size={22} />
          </button>
          <h3>AI Extract</h3>
          <div style={{ width: 38 }} />
        </div>

        <div className="usp-body">
          <p className="usp-section-label">Paste Your Schedule Text Below</p>
          <p className="usp-section-hint">
            Copy from an email, PDF, or website — AI will extract events automatically
          </p>

          <textarea
            className="usp-ai-textarea"
            placeholder={`e.g.\nMonday: CS201 9:00am - 10:30am, Room 204\nTuesday: CS201 Lab 2:00pm - 4:00pm, Engineering Bldg...`}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            rows={8}
          />

          <button
            className="usp-process-btn"
            disabled={!aiText.trim() || isProcessing}
            onClick={handleProcessAI}
          >
            <MdSmartToy size={20} /> {isProcessing ? 'Processing…' : 'Extract Events'}
          </button>

          {isProcessing && (
            <div className="usp-processing">
              <div className="usp-spinner" />
              <p>AI is reading your schedule …</p>
            </div>
          )}

          {extractedEvents.length > 0 && <ExtractedEventsList />}
        </div>

        <BottomNav />
      </div>
    );
  }

  return null;
}
