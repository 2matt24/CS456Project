import React, { useMemo } from 'react';
import { MdClose, MdTrendingUp, MdTrendingDown, MdTrendingFlat } from 'react-icons/md';
import '../styles/WeeklyReportModal.css';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function fmt(date) {
  if (!date) return '';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function CircleProgress({ pct, hours, goalHours }) {
  const R = 52;
  const circ = 2 * Math.PI * R;
  const filled = Math.min(pct / 100, 1) * circ;

  return (
    <div className="wr-ring-wrap">
      <svg className="wr-ring-svg" viewBox="0 0 120 120" width="120" height="120">
        {/* track */}
        <circle cx="60" cy="60" r={R} fill="none" stroke="#f0f0f8" strokeWidth="10" />
        {/* fill */}
        <circle
          cx="60" cy="60" r={R}
          fill="none"
          stroke="url(#wr-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={circ * 0.25}   /* start from top */
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <defs>
          <linearGradient id="wr-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>
      </svg>
      <div className="wr-ring-center">
        <span className="wr-ring-hours">{hours}h</span>
        <span className="wr-ring-goal">of {goalHours}h goal</span>
      </div>
    </div>
  );
}

function DailyBar({ day, minutes, maxMinutes }) {
  const pct = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
  const label = day.slice(0, 3);
  return (
    <div className="wr-day-col">
      <div className="wr-day-bar-track">
        <div
          className="wr-day-bar-fill"
          style={{ height: `${Math.max(pct, 2)}%` }}
          title={`${Math.round(minutes / 60 * 10) / 10}h`}
        />
      </div>
      <span className="wr-day-label">{label}</span>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function WeeklyReportModal({ report, isNew, onClose }) {
  if (!report) return null;

  const {
    weekStart, weekEnd,
    totalHours, totalMinutes,
    sessionCount, coursesStudied, notesCreated,
    goalCompletion, weeklyGoalHours,
    comparison,
    reportData,
  } = report;

  const daily    = reportData?.dailyBreakdown || {};
  const courses  = reportData?.topCourses     || [];
  const achiev   = reportData?.achievements   || [];

  const maxDayMins = useMemo(
    () => Math.max(1, ...DAY_ORDER.map(d => daily[d] || 0)),
    [daily]
  );

  const { minutesDelta, hoursDelta, percentChange } = comparison || {};
  const hasDelta = minutesDelta !== 0;
  const deltaPositive = minutesDelta > 0;

  /* motivational message */
  let motivation = '';
  if (goalCompletion >= 100)      motivation = '🏆 Goal crushed! You\'re on fire this week!';
  else if (goalCompletion >= 75)  motivation = '💪 Almost there — great consistency!';
  else if (goalCompletion >= 50)  motivation = '📈 Solid effort. Push a bit more next week!';
  else if (totalMinutes > 0)      motivation = '🌱 Every session counts. Keep building the habit!';
  else                            motivation = '✨ Start your first session to see progress here.';

  return (
    <div className="wr-overlay" onClick={onClose}>
      <div className="wr-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="wr-header">
          <div>
            {isNew && <span className="wr-new-badge">New Report</span>}
            <h2 className="wr-title">Weekly Report</h2>
            <p className="wr-date-range">{fmt(weekStart)} – {fmt(weekEnd)}</p>
          </div>
          <button className="wr-close-btn" onClick={onClose} aria-label="Close">
            <MdClose size={22} />
          </button>
        </div>

        <div className="wr-body">

          {/* ── Hero ring + motivation ── */}
          <div className="wr-hero">
            <CircleProgress
              pct={goalCompletion}
              hours={totalHours}
              goalHours={weeklyGoalHours}
            />
            <div className="wr-hero-right">
              <p className="wr-pct">{goalCompletion}% of goal</p>
              {hasDelta && (
                <p className={`wr-delta ${deltaPositive ? 'up' : 'down'}`}>
                  {deltaPositive
                    ? <MdTrendingUp size={16} />
                    : <MdTrendingDown size={16} />}
                  {' '}{Math.abs(hoursDelta)}h {deltaPositive ? 'more' : 'less'} than last week
                  {' '}
                  <span className="wr-delta-pct">
                    ({deltaPositive ? '+' : ''}{Math.round(percentChange)}%)
                  </span>
                </p>
              )}
              {!hasDelta && (
                <p className="wr-delta neutral">
                  <MdTrendingFlat size={16} /> Same as last week
                </p>
              )}
              <p className="wr-motivation">{motivation}</p>
            </div>
          </div>

          {/* ── Stats grid ── */}
          <div className="wr-stats-grid">
            <div className="wr-stat-card">
              <span className="wr-stat-icon">🗓</span>
              <span className="wr-stat-val">{sessionCount}</span>
              <span className="wr-stat-lbl">Sessions</span>
            </div>
            <div className="wr-stat-card">
              <span className="wr-stat-icon">📖</span>
              <span className="wr-stat-val">{notesCreated}</span>
              <span className="wr-stat-lbl">Notes</span>
            </div>
            <div className="wr-stat-card">
              <span className="wr-stat-icon">🎓</span>
              <span className="wr-stat-val">{coursesStudied}</span>
              <span className="wr-stat-lbl">Courses</span>
            </div>
          </div>

          {/* ── Daily breakdown ── */}
          <div className="wr-section">
            <h4 className="wr-section-title">Daily Breakdown</h4>
            <div className="wr-daily-chart">
              {DAY_ORDER.map(day => (
                <DailyBar
                  key={day}
                  day={day}
                  minutes={daily[day] || 0}
                  maxMinutes={maxDayMins}
                />
              ))}
            </div>
          </div>

          {/* ── Top courses ── */}
          {courses.length > 0 && (
            <div className="wr-section">
              <h4 className="wr-section-title">Top Courses</h4>
              <div className="wr-courses-list">
                {courses.map((c, i) => (
                  <div key={i} className="wr-course-row">
                    <span className="wr-course-icon" style={{ background: c.color + '22', color: c.color }}>
                      {c.icon}
                    </span>
                    <div className="wr-course-info">
                      <span className="wr-course-name">{c.courseName}</span>
                      <div className="wr-course-bar-track">
                        <div
                          className="wr-course-bar-fill"
                          style={{
                            width: `${Math.min((c.minutes / (courses[0]?.minutes || 1)) * 100, 100)}%`,
                            background: c.color || '#667eea',
                          }}
                        />
                      </div>
                    </div>
                    <span className="wr-course-hours">{c.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Achievements ── */}
          {achiev.length > 0 && (
            <div className="wr-section">
              <h4 className="wr-section-title">Achievements</h4>
              <div className="wr-achievements">
                {achiev.map((a, i) => (
                  <div key={i} className="wr-achievement-chip">
                    <span>{a.icon}</span>
                    <span>{a.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="wr-footer">
          <button className="wr-close-footer-btn" onClick={onClose}>
            Got it! 🚀
          </button>
        </div>

      </div>
    </div>
  );
}
