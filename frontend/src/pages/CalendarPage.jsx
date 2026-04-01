import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdAdd } from 'react-icons/io';
import {
  MdArrowBack, MdCalendarToday, MdHome, MdChat, MdSettings,
  MdChevronLeft, MdChevronRight, MdLocationOn, MdAccessTime, MdClose
} from 'react-icons/md';
import '../styles/CalendarPage.css';

const SAMPLE_EVENTS = [
  { id: 1, title: 'CS456 Lecture', startHour: 9, startMin: 0, endHour: 10, endMin: 30, day: 1, color: '#667eea', location: 'Room 204', type: 'school' },
  { id: 2, title: 'Data Structures Lab', startHour: 14, startMin: 0, endHour: 16, endMin: 0, day: 2, color: '#f093fb', location: 'Engineering Bldg', type: 'school' },
  { id: 3, title: 'Study Group', startHour: 15, startMin: 30, endHour: 17, endMin: 0, day: 3, color: '#4facfe', location: 'Library', type: 'school' },
  { id: 4, title: 'Work Shift', startHour: 10, startMin: 0, endHour: 14, endMin: 0, day: 4, color: '#feca57', location: 'Main Office', type: 'work' },
  { id: 5, title: 'CS456 Lecture', startHour: 9, startMin: 0, endHour: 10, endMin: 30, day: 5, color: '#667eea', location: 'Room 204', type: 'school' },
  { id: 6, title: 'Gym', startHour: 7, startMin: 0, endHour: 8, endMin: 30, day: 1, color: '#43e97b', location: 'Recreation Center', type: 'personal' },
  { id: 7, title: 'Algorithms Exam', startHour: 13, startMin: 0, endHour: 15, endMin: 0, day: 3, color: '#ff6b6b', location: 'Exam Hall A', type: 'school' },
  { id: 8, title: 'Office Hours', startHour: 15, startMin: 0, endHour: 16, endMin: 0, day: 4, color: '#667eea', location: 'Prof. Office', type: 'school' },
];

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm
const CELL_HEIGHT = 60;
const TIME_GUTTER_WIDTH = 52;

// ─── helper functions ────────────────────────────────────────────────────────

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
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
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
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
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDay = new Date(firstDay);
  const dow = firstDay.getDay(); // 0 = Sun
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

// Map a calendar date to recurring weekly events (ev.day: 1=Mon … 7=Sun)
function getEventsForDayOfWeek(date) {
  const dow = date.getDay(); // 0 = Sun
  const dayNum = dow === 0 ? 7 : dow;
  return SAMPLE_EVENTS.filter(ev => ev.day === dayNum);
}

function getAgendaItems(fromDate) {
  const items = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    const dayNum = dow === 0 ? 7 : dow;
    const dayEvents = SAMPLE_EVENTS.filter(ev => ev.day === dayNum);
    if (dayEvents.length > 0 || sameDay(d, new Date())) {
      items.push({ date: new Date(d), events: dayEvents });
    }
  }
  return items;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const gridRef = useRef(null);

  const now = new Date();
  const weekStart = getWeekStart(currentDate);
  const weekDays = getWeekDays(weekStart);
  const isCurrentWeek = weekDays.some(d => sameDay(d, now));
  const currentTimeTop = (now.getHours() - 7 + now.getMinutes() / 60) * CELL_HEIGHT;

  // Auto-scroll week grid to show ~8am on mount / view switch
  useEffect(() => {
    if (view === 'week' && gridRef.current) {
      gridRef.current.scrollTop = CELL_HEIGHT; // skip 7am row
    }
  }, [view]);

  // ── navigation ──────────────────────────────────────────────────────────────
  function goPrev() {
    const d = new Date(currentDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  }

  function goNext() {
    const d = new Date(currentDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  }

  // ── WEEK VIEW ────────────────────────────────────────────────────────────────
  const renderWeekView = () => (
    <div className="cal-week-container">
      {/* Sticky header row */}
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

      {/* Scrollable grid */}
      <div className="cal-week-grid" ref={gridRef}>
        {/* Hour rows (background grid) */}
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

        {/* Absolutely positioned event blocks */}
        {weekDays.map((d, di) =>
          SAMPLE_EVENTS
            .filter(ev => ev.day === di + 1)
            .map(ev => {
              const top = ((ev.startHour - 7) + ev.startMin / 60) * CELL_HEIGHT;
              const height = ((ev.endHour - ev.startHour) + (ev.endMin - ev.startMin) / 60) * CELL_HEIGHT;
              return (
                <div
                  key={ev.id}
                  className="cal-event-block"
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 28)}px`,
                    left: `calc(${TIME_GUTTER_WIDTH}px + ${di} * (100% - ${TIME_GUTTER_WIDTH}px) / 7 + 2px)`,
                    width: `calc((100% - ${TIME_GUTTER_WIDTH}px) / 7 - 4px)`,
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

        {/* Current time indicator */}
        {isCurrentWeek && (
          <div className="cal-now-line" style={{ top: `${currentTimeTop}px` }} />
        )}
      </div>
    </div>
  );

  // ── MONTH VIEW ───────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const monthDays = getMonthGrid(currentDate);
    const currentMonth = currentDate.getMonth();
    const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="cal-month-container">
        {/* Day-of-week header */}
        <div className="cal-month-header-row">
          {DOW_LABELS.map(label => (
            <div key={label} className="cal-month-dow">{label}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="cal-month-grid">
          {monthDays.map((day, idx) => {
            const isOther = day.getMonth() !== currentMonth;
            const isToday = sameDay(day, now);
            const isSelected = selectedDay && sameDay(day, selectedDay);
            const dayEvents = getEventsForDayOfWeek(day);
            const visibleDots = dayEvents.slice(0, 3);
            const extraCount = dayEvents.length - 3;

            return (
              <div
                key={idx}
                className={[
                  'cal-month-cell',
                  isOther ? 'other-month' : '',
                  isToday ? 'today' : '',
                  isSelected ? 'selected' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedDay(isSelected ? null : new Date(day))}
              >
                <div className="cal-month-date">{day.getDate()}</div>
                <div className="cal-month-dots">
                  {visibleDots.map(ev => (
                    <div
                      key={ev.id}
                      className="cal-month-dot"
                      style={{ background: ev.color }}
                    />
                  ))}
                  {extraCount > 0 && (
                    <span className="cal-month-more">+{extraCount}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected-day event list */}
        {selectedDay && (
          <div className="cal-day-events">
            <div className="cal-day-events-title">
              {selectedDay.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </div>
            {getEventsForDayOfWeek(selectedDay).length === 0 ? (
              <p className="cal-agenda-free">No events</p>
            ) : (
              getEventsForDayOfWeek(selectedDay).map(ev => (
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
    const agendaItems = getAgendaItems(currentDate);

    return (
      <div className="cal-agenda-container">
        {agendaItems.map(group => (
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
        ))}
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
        <button className="cal-today-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
      </div>

      {/* View content */}
      <div className="cal-content">
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
        {view === 'agenda' && renderAgendaView()}
      </div>

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
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
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

    </div>
  );
}
