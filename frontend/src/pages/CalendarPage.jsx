import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd } from 'react-icons/io';
import {
  MdArrowBack, MdCalendarToday, MdHome, MdChat, MdSettings,
  MdChevronLeft, MdChevronRight, MdLocationOn, MdAccessTime, MdClose,
  MdRefresh, MdAttachFile, MdDelete,
} from 'react-icons/md';
import { scheduleAPI } from '../services/api';
import '../styles/CalendarPage.css';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm
const CELL_HEIGHT = 60;
const TIME_GUTTER_WIDTH = 52;

const DAY_NAME_TO_NUM = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
  Friday: 5, Saturday: 6, Sunday: 7,
};

// ── Convert an API event (with "HH:MM" times and days array) into one or more
//    internal calendar entries (with startHour/startMin/day: 1-7).
//    A weekly event with days:["Monday","Wednesday"] expands into 2 entries.
function apiEventsToCalendar(apiEvents) {
  const result = [];
  for (const ev of apiEvents) {
    const [startH, startM] = (ev.startTime || '00:00').split(':').map(Number);
    const [endH, endM]     = (ev.endTime   || '00:00').split(':').map(Number);
    const base = {
      id:       ev.eventID,
      title:    ev.title,
      color:    ev.color || '#667eea',
      location: ev.location || '',
      type:     ev.type || 'school',
      startHour: startH,
      startMin:  startM,
      endHour:   endH,
      endMin:    endM,
      uploadedFileUrl:  ev.uploadedFileUrl  || null,
      uploadedFileName: ev.uploadedFileName || null,
      uploadedFileType: ev.uploadedFileType || null,
    };

    const days = Array.isArray(ev.days) ? ev.days : [];

    if (days.length > 0) {
      // Recurring: one entry per day-of-week
      days.forEach(dayName => {
        const dayNum = DAY_NAME_TO_NUM[dayName];
        if (dayNum) {
          result.push({ ...base, id: `${ev.eventID}-${dayName}`, day: dayNum });
        }
      });
    } else if (ev.startDate) {
      // One-off: figure out day-of-week from the date
      const d = new Date(ev.startDate + 'T00:00:00');
      const dow = d.getDay(); // 0 = Sun
      result.push({ ...base, day: dow === 0 ? 7 : dow });
    }
  }
  return result;
}

// ─── helper functions ────────────────────────────────────────────────────────

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDayShort(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatTime(h, m) {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function getMonthGrid(date) {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  let startDay = new Date(firstDay);
  const dow = firstDay.getDay();
  startDay.setDate(startDay.getDate() - (dow === 0 ? 6 : dow - 1));

  const days = [];
  const cur = new Date(startDay);
  while (cur <= lastDay || days.length % 7 !== 0) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
    if (days.length > 42) break;
  }
  return days;
}

function getEventsForDayOfWeek(date, calEvents) {
  const dow    = date.getDay();
  const dayNum = dow === 0 ? 7 : dow;
  return calEvents.filter(ev => ev.day === dayNum);
}

function getAgendaItems(fromDate, calEvents) {
  const items = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const dayEvents = getEventsForDayOfWeek(d, calEvents);
    if (dayEvents.length > 0 || sameDay(d, new Date())) {
      items.push({ date: new Date(d), events: dayEvents });
    }
  }
  return items;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();

  const [view, setView]               = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDay, setSelectedDay]     = useState(null);
  const [calEvents, setCalEvents]         = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [loadError, setLoadError]         = useState('');
  const gridRef = useRef(null);

  const now       = new Date();
  const weekStart = getWeekStart(currentDate);
  const weekDays  = getWeekDays(weekStart);
  const isCurrentWeek   = weekDays.some(d => sameDay(d, now));
  const currentTimeTop  = (now.getHours() - 7 + now.getMinutes() / 60) * CELL_HEIGHT;

  // ── Load events from API ────────────────────────────────────────────────────
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setIsLoading(true);
    setLoadError('');
    try {
      const apiEvents = await scheduleAPI.getAll();
      setCalEvents(apiEventsToCalendar(apiEvents));
    } catch (err) {
      console.error('[CalendarPage] load error:', err);
      setLoadError('Could not load events. Pull down to retry.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Delete a single event ───────────────────────────────────────────────────
  async function handleDeleteEvent(calEvent) {
    if (!window.confirm(`Delete "${calEvent.title}"?\n\nThis removes only this event — your course stays intact.`)) return;
    // Recurring events have composite IDs like "123-Monday"; extract the numeric part
    const numericId = parseInt(calEvent.id.toString().split('-')[0], 10);
    try {
      const res = await fetch(
        `https://cs456project.onrender.com/api/schedule/events/${numericId}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!res.ok) throw new Error('Delete failed');
      setSelectedEvent(null);
      loadEvents();
    } catch (err) {
      console.error('[CalendarPage] delete error:', err);
      alert('Failed to delete event. Please try again.');
    }
  }

  // Auto-scroll week grid to 8am on mount / view switch
  useEffect(() => {
    if (view === 'week' && gridRef.current) {
      gridRef.current.scrollTop = CELL_HEIGHT;
    }
  }, [view]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  function goPrev() {
    const d = new Date(currentDate);
    view === 'month' ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }
  function goNext() {
    const d = new Date(currentDate);
    view === 'month' ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  // ── WEEK VIEW ────────────────────────────────────────────────────────────────
  const renderWeekView = () => (
    <div className="cal-week-container">
      <div className="cal-week-header">
        <div className="cal-time-gutter" />
        {weekDays.map((d, i) => (
          <div key={i} className={`cal-day-header ${sameDay(d, now) ? 'today' : ''}`}>
            <span className="cal-day-name">{formatDayShort(d)}</span>
            <span className={`cal-day-num ${sameDay(d, now) ? 'today-num' : ''}`}>
              {d.getDate()}
            </span>
          </div>
        ))}
      </div>

      <div className="cal-week-grid" ref={gridRef}>
        {HOURS.map(hour => (
          <div key={hour} className="cal-hour-row">
            <div className="cal-time-label">
              {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
            </div>
            {weekDays.map((d, di) => (
              <div key={di} className={`cal-cell ${sameDay(d, now) ? 'today-col' : ''}`} />
            ))}
          </div>
        ))}

        {/* Event blocks */}
        {weekDays.map((_, di) =>
          calEvents
            .filter(ev => ev.day === di + 1)
            .map(ev => {
              const top    = ((ev.startHour - 7) + ev.startMin / 60) * CELL_HEIGHT;
              const height = ((ev.endHour - ev.startHour) + (ev.endMin - ev.startMin) / 60) * CELL_HEIGHT;
              return (
                <div
                  key={ev.id}
                  className="cal-event-block"
                  style={{
                    top:    `${top}px`,
                    height: `${Math.max(height, 28)}px`,
                    left:   `calc(${TIME_GUTTER_WIDTH}px + ${di} * (100% - ${TIME_GUTTER_WIDTH}px) / 7 + 2px)`,
                    width:  `calc((100% - ${TIME_GUTTER_WIDTH}px) / 7 - 4px)`,
                    background: ev.color,
                  }}
                  onClick={() => setSelectedEvent(ev)}
                >
                  <p className="cal-event-title">{ev.title}</p>
                  <p className="cal-event-time-label">{formatTime(ev.startHour, ev.startMin)}</p>
                </div>
              );
            })
        )}

        {isCurrentWeek && (
          <div className="cal-now-line" style={{ top: `${currentTimeTop}px` }} />
        )}
      </div>
    </div>
  );

  // ── MONTH VIEW ───────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const monthDays    = getMonthGrid(currentDate);
    const currentMonth = currentDate.getMonth();
    const DOW_LABELS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="cal-month-container">
        <div className="cal-month-header-row">
          {DOW_LABELS.map(label => (
            <div key={label} className="cal-month-dow">{label}</div>
          ))}
        </div>
        <div className="cal-month-grid">
          {monthDays.map((day, idx) => {
            const isOther    = day.getMonth() !== currentMonth;
            const isToday    = sameDay(day, now);
            const isSelected = selectedDay && sameDay(day, selectedDay);
            const dayEvents  = getEventsForDayOfWeek(day, calEvents);
            const visibleDots = dayEvents.slice(0, 3);
            const extraCount  = dayEvents.length - 3;

            return (
              <div
                key={idx}
                className={[
                  'cal-month-cell',
                  isOther    ? 'other-month' : '',
                  isToday    ? 'today'       : '',
                  isSelected ? 'selected'    : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedDay(isSelected ? null : new Date(day))}
              >
                <div className="cal-month-date">{day.getDate()}</div>
                <div className="cal-month-dots">
                  {visibleDots.map((ev, i) => (
                    <div key={i} className="cal-month-dot" style={{ background: ev.color }} />
                  ))}
                  {extraCount > 0 && <span className="cal-month-more">+{extraCount}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDay && (
          <div className="cal-day-events">
            <div className="cal-day-events-title">
              {selectedDay.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </div>
            {getEventsForDayOfWeek(selectedDay, calEvents).length === 0 ? (
              <p className="cal-agenda-free">No events</p>
            ) : (
              getEventsForDayOfWeek(selectedDay, calEvents).map(ev => (
                <div
                  key={ev.id}
                  className="cal-agenda-event"
                  style={{ borderLeftColor: ev.color }}
                  onClick={() => setSelectedEvent(ev)}
                >
                  <div className="cal-agenda-event-time">
                    {formatTime(ev.startHour, ev.startMin)} – {formatTime(ev.endHour, ev.endMin)}
                  </div>
                  <div className="cal-agenda-event-title">{ev.title}</div>
                  {ev.location && (
                    <div className="cal-agenda-event-loc">
                      <MdLocationOn size={12} /> {ev.location}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  // ── AGENDA VIEW ──────────────────────────────────────────────────────────────
  const renderAgendaView = () => {
    const agendaItems = getAgendaItems(currentDate, calEvents);
    return (
      <div className="cal-agenda-container">
        {agendaItems.length === 0 ? (
          <div className="cal-empty-state">
            <span style={{ fontSize: 48 }}>📅</span>
            <p>No events in the next 14 days.</p>
            <button className="cal-today-btn" onClick={() => navigate('/schedule/upload')}>
              + Add Schedule
            </button>
          </div>
        ) : (
          agendaItems.map(group => (
            <div key={group.date.toISOString()} className="cal-agenda-group">
              <div className={`cal-agenda-date-header ${sameDay(group.date, new Date()) ? 'today' : ''}`}>
                <span className="cal-agenda-weekday">
                  {group.date.toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                <span className="cal-agenda-datenum">
                  {group.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {group.events.length === 0 ? (
                <p className="cal-agenda-free">No events</p>
              ) : (
                group.events.map(ev => (
                  <div
                    key={ev.id}
                    className="cal-agenda-event"
                    onClick={() => setSelectedEvent(ev)}
                    style={{ borderLeftColor: ev.color }}
                  >
                    <div className="cal-agenda-event-time">
                      {formatTime(ev.startHour, ev.startMin)} – {formatTime(ev.endHour, ev.endMin)}
                    </div>
                    <div className="cal-agenda-event-title">{ev.title}</div>
                    {ev.location && (
                      <div className="cal-agenda-event-loc">
                        <MdLocationOn size={12} /> {ev.location}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="cal-container">

      {/* Navbar */}
      <div className="cal-navbar">
        <button className="cal-nav-btn" onClick={() => navigate('/dashboard')}>
          <MdArrowBack size={22} />
        </button>
        <div className="cal-nav-center">
          <button className="cal-arrow-btn" onClick={goPrev}>
            <MdChevronLeft size={22} />
          </button>
          <h3 className="cal-month-label">{formatMonthYear(currentDate)}</h3>
          <button className="cal-arrow-btn" onClick={goNext}>
            <MdChevronRight size={22} />
          </button>
        </div>
        <button className="cal-nav-btn" onClick={() => navigate('/schedule/upload')}>
          <IoMdAdd size={22} />
        </button>
      </div>

      {/* View switcher */}
      <div className="cal-view-bar">
        <div className="cal-view-tabs">
          {['week', 'month', 'agenda'].map(v => (
            <button
              key={v}
              className={`cal-view-tab ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="cal-today-btn" style={{ background: 'none', border: '1px solid #e0e4ef', color: '#667eea' }} onClick={loadEvents} title="Refresh">
            <MdRefresh size={18} />
          </button>
          <button className="cal-today-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
        </div>
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div className="cal-loading">
          <div className="cal-spinner" />
          <p>Loading your schedule…</p>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="cal-error-banner">
          {loadError}
          <button onClick={loadEvents}><MdRefresh size={16} /> Retry</button>
        </div>
      )}

      {/* Empty state (no events at all) */}
      {!isLoading && !loadError && calEvents.length === 0 && (
        <div className="cal-empty-state">
          <span style={{ fontSize: 52 }}>📅</span>
          <p style={{ fontWeight: 700, fontSize: 17, color: '#333', margin: '8px 0 4px' }}>
            No events yet
          </p>
          <p style={{ color: '#9aa0b0', fontSize: 14, margin: '0 0 16px' }}>
            Add your first schedule to see it here
          </p>
          <button className="cal-today-btn" onClick={() => navigate('/schedule/upload')}>
            + Add Schedule
          </button>
        </div>
      )}

      {/* View content */}
      {!isLoading && (
        <div className="cal-content">
          {view === 'week'   && renderWeekView()}
          {view === 'month'  && renderMonthView()}
          {view === 'agenda' && renderAgendaView()}
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="cal-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header" style={{ background: selectedEvent.color }}>
              <h3>{selectedEvent.title}</h3>
              <button className="cal-modal-close" onClick={() => setSelectedEvent(null)}>
                <MdClose size={22} color="white" />
              </button>
            </div>
            <div className="cal-modal-body">
              <div className="cal-modal-row">
                <MdAccessTime size={18} color="#667eea" />
                <span>
                  {formatTime(selectedEvent.startHour, selectedEvent.startMin)}
                  {' – '}
                  {formatTime(selectedEvent.endHour, selectedEvent.endMin)}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="cal-modal-row">
                  <MdLocationOn size={18} color="#667eea" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              <div
                className="cal-modal-type-badge"
                style={{ background: selectedEvent.color + '22', color: selectedEvent.color }}
              >
                {selectedEvent.type === 'school'
                  ? '🎓 School'
                  : selectedEvent.type === 'work'
                  ? '💼 Work'
                  : '🏃 Personal'}
              </div>
              {selectedEvent.uploadedFileUrl && (
                <div className="cal-modal-file">
                  <MdAttachFile size={16} color="#667eea" />
                  <a
                    href={selectedEvent.uploadedFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cal-file-link"
                  >
                    View Original Schedule ({selectedEvent.uploadedFileName || 'file'})
                  </a>
                </div>
              )}
              <button
                className="cal-modal-delete-btn"
                onClick={() => handleDeleteEvent(selectedEvent)}
              >
                <MdDelete size={18} /> Delete This Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/schedule/upload')}>
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
    </div>
  );
}
