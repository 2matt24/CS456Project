"""
Weekly Progress Report generation and retrieval.

Auto-generation strategy: every call to GET /api/reports/weekly/latest
silently generates the most-recently-completed week's report if one does
not already exist.  No cron job is needed.
"""

import json
import os
from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, request

from aistudyassistant.extensions import db
from aistudyassistant.models.course import Course
from aistudyassistant.models.note import Note
from aistudyassistant.models.study_session import StudySession
from aistudyassistant.models.user import User
from aistudyassistant.models.weekly_report import WeeklyReport
from aistudyassistant.routes.notifications import create_notification_for_user
from aistudyassistant.services.auth_tokens import get_authenticated_user_id

reports_bp = Blueprint("reports", __name__)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ── Auth helper ───────────────────────────────────────────────────────────────

def _current_user_id():
    return get_authenticated_user_id()


# ── Mock email ────────────────────────────────────────────────────────────────

def _mock_send_email(user_id: int, report: WeeklyReport, report_data: dict) -> dict:
    """
    Mock email implementation — logs the email content to console and returns
    it in the API response. Replace the body of this function with a real
    SendGrid / SES call when email sending is needed.
    """
    user = User.query.get(user_id)
    to_email = user.Email if user else "user@example.com"
    name     = (user.FirstName if user else None) or "Student"

    daily   = report_data.get("dailyBreakdown", {})
    courses = report_data.get("topCourses", [])
    achiev  = report_data.get("achievements", [])

    hours   = round((report.TotalStudyMinutes or 0) / 60, 1)
    goal_h  = round((report.WeeklyGoalMinutes or 600) / 60, 1)
    pct     = report.GoalCompletionPercent or 0
    delta_h = round((report.MinutesDelta or 0) / 60, 1)
    week_lbl = report.WeekStartDate.strftime("%b %d") if report.WeekStartDate else "this week"

    subject = f"📊 Your Weekly Study Report — week of {week_lbl}"

    body_lines = [
        f"Hi {name},",
        "",
        f"Here's your study summary for the week of {week_lbl}:",
        "",
        f"  📚 Total study time : {hours}h  (goal: {goal_h}h, {pct}% complete)",
        f"  🗓  Sessions          : {report.StudySessionsCount or 0}",
        f"  📖 Notes created     : {report.NotesCreated or 0}",
        f"  🎓 Courses studied   : {report.CoursesStudied or 0}",
    ]

    if delta_h != 0:
        direction = "more" if delta_h > 0 else "less"
        arrow = "📈" if delta_h > 0 else "📉"
        body_lines.append(f"  {arrow} vs last week    : {abs(delta_h)}h {direction}")

    if daily:
        body_lines += ["", "Daily breakdown:"]
        for day, mins in daily.items():
            bar = "█" * (mins // 30) if mins else "-"
            body_lines.append(f"  {day[:3]}  {round(mins / 60, 1):>4}h  {bar}")

    if courses:
        body_lines += ["", "Top courses:"]
        for c in courses:
            body_lines.append(f"  {c.get('icon', '📚')} {c.get('courseName', '?')} — {c.get('hours', 0)}h")

    if achiev:
        body_lines += ["", "Achievements unlocked:"]
        for a in achiev:
            body_lines.append(f"  {a.get('icon', '')} {a.get('text', '')}")

    body_lines += ["", "Keep up the great work!", "— Your AI Study Assistant"]

    email_body = "\n".join(body_lines)

    # ── Mock send (log to console) ────────────────────────────────────────────
    print(f"\n[MOCK EMAIL] ─────────────────────────────────────")
    print(f"  To     : {to_email}")
    print(f"  Subject: {subject}")
    print(f"  Body   :\n{email_body}")
    print(f"[MOCK EMAIL] ─────────────────────────────────────\n")

    return {
        "mock": True,
        "to": to_email,
        "subject": subject,
        "body": email_body,
    }


# ── Serialiser ────────────────────────────────────────────────────────────────

def _serialize_report(r: WeeklyReport, is_new: bool = False) -> dict:
    try:
        report_data = json.loads(r.ReportData) if r.ReportData else {}
    except (ValueError, TypeError):
        report_data = {}

    return {
        "reportID":          r.ReportID,
        "weekStart":         r.WeekStartDate.isoformat(),
        "weekEnd":           r.WeekEndDate.isoformat(),
        "totalHours":        round((r.TotalStudyMinutes or 0) / 60, 1),
        "totalMinutes":      r.TotalStudyMinutes or 0,
        "sessionCount":      r.StudySessionsCount or 0,
        "coursesStudied":    r.CoursesStudied or 0,
        "notesCreated":      r.NotesCreated or 0,
        "notesViewed":       r.NotesViewed or 0,
        "quizzesGenerated":  r.QuizzesGenerated or 0,
        "goalCompletion":    r.GoalCompletionPercent or 0,
        "weeklyGoalMinutes": r.WeeklyGoalMinutes,
        "weeklyGoalHours":   round((r.WeeklyGoalMinutes or 600) / 60, 1),
        "comparison": {
            "minutesDelta":  r.MinutesDelta or 0,
            "hoursDelta":    round((r.MinutesDelta or 0) / 60, 1),
            "percentChange": float(r.PercentChange or 0),
        },
        "reportData": report_data,
        "createdAt":  r.CreatedAt.isoformat() if r.CreatedAt else None,
        "sentAt":     r.SentAt.isoformat()    if r.SentAt    else None,
        "isNew":      is_new,
    }


# ── Core generation logic ─────────────────────────────────────────────────────

def _generate_report(user_id: int, week_start: date, week_end: date) -> WeeklyReport:
    """Build and persist a WeeklyReport for the given date range."""

    # ── Date boundaries (inclusive, UTC midnight on each side) ───────────────
    start_dt = datetime(week_start.year, week_start.month, week_start.day,
                        tzinfo=timezone.utc)
    end_dt   = datetime(week_end.year,   week_end.month,   week_end.day, 23, 59, 59,
                        tzinfo=timezone.utc)

    # ── Study sessions ────────────────────────────────────────────────────────
    sessions = (
        StudySession.query
        .filter(
            StudySession.UserID    == user_id,
            StudySession.SessionType != "break",
            StudySession.StartTime >= start_dt,
            StudySession.StartTime <= end_dt,
        )
        .all()
    )

    total_minutes  = sum(s.DurationMinutes or 0 for s in sessions)
    session_count  = len(sessions)
    courses_studied = len({s.CourseID for s in sessions if s.CourseID})

    # ── Notes created this week (join through Course for ownership) ───────────
    notes_created = (
        db.session.query(Note)
        .join(Course, Note.CourseID == Course.CourseID)
        .filter(
            Course.UserID    == user_id,
            Note.CreatedAt   >= start_dt,
            Note.CreatedAt   <= end_dt,
        )
        .count()
    )

    # ── Notes viewed this week ────────────────────────────────────────────────
    # Proxy: count notes updated (LastModified) during the week but created
    # before the week started — a reasonable signal for "revisited" notes.
    # Replace with a dedicated NoteViews table when view-tracking is added.
    notes_viewed = (
        db.session.query(Note)
        .join(Course, Note.CourseID == Course.CourseID)
        .filter(
            Course.UserID         == user_id,
            Note.UpdatedAt        >= start_dt,
            Note.UpdatedAt        <= end_dt,
            Note.CreatedAt        < start_dt,   # was created before this week
        )
        .count()
    ) if hasattr(Note, "UpdatedAt") else 0

    # ── Quizzes / AI chat turns generated this week ───────────────────────────
    # We don't yet have a dedicated Quizzes table; default to 0 until added.
    quizzes_generated = 0

    # ── User goal ─────────────────────────────────────────────────────────────
    user = User.query.get(user_id)
    goal_hours   = (user.StudyGoalHoursPerWeek or 10) if user else 10
    goal_minutes = goal_hours * 60
    goal_percent = min(100, int((total_minutes / goal_minutes) * 100)) if goal_minutes else 0

    # ── Comparison with previous week ─────────────────────────────────────────
    prev_week_start = week_start - timedelta(weeks=1)
    prev_report = WeeklyReport.query.filter_by(
        UserID=user_id, WeekStartDate=prev_week_start
    ).first()

    minutes_delta  = 0
    percent_change = 0.0
    if prev_report and (prev_report.TotalStudyMinutes or 0) > 0:
        minutes_delta  = total_minutes - (prev_report.TotalStudyMinutes or 0)
        percent_change = (minutes_delta / prev_report.TotalStudyMinutes) * 100

    # ── Daily breakdown ────────────────────────────────────────────────────────
    daily_breakdown = {name: 0 for name in DAY_NAMES}
    for s in sessions:
        if s.StartTime:
            st = s.StartTime
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            day_name = DAY_NAMES[st.weekday()]
            daily_breakdown[day_name] += s.DurationMinutes or 0

    # ── Top courses ────────────────────────────────────────────────────────────
    course_minutes: dict[int, int] = {}
    for s in sessions:
        if s.CourseID and s.DurationMinutes:
            course_minutes[s.CourseID] = course_minutes.get(s.CourseID, 0) + s.DurationMinutes

    top_courses = []
    for cid, mins in sorted(course_minutes.items(), key=lambda x: -x[1])[:5]:
        c = Course.query.get(cid)
        if c:
            top_courses.append({
                "courseName": c.CourseName,
                "color":      c.Color or "#667eea",
                "icon":       c.Icon  or "📚",
                "minutes":    mins,
                "hours":      round(mins / 60, 1),
            })

    # ── Achievements ──────────────────────────────────────────────────────────
    achievements = []
    if goal_percent >= 100:
        achievements.append({"icon": "🏆", "text": "Weekly goal crushed!"})
    if session_count >= 5:
        achievements.append({"icon": "🔥", "text": f"{session_count} sessions — great consistency!"})
    if notes_created >= 3:
        achievements.append({"icon": "📝", "text": f"{notes_created} new notes added"})
    if minutes_delta > 60:
        achievements.append({"icon": "📈", "text": f"{round(minutes_delta/60, 1)}h more than last week"})

    report_data = {
        "dailyBreakdown": daily_breakdown,
        "topCourses":     top_courses,
        "achievements":   achievements,
    }

    # ── Persist ───────────────────────────────────────────────────────────────
    report = WeeklyReport(
        UserID               = user_id,
        WeekStartDate        = week_start,
        WeekEndDate          = week_end,
        TotalStudyMinutes    = total_minutes,
        StudySessionsCount   = session_count,
        CoursesStudied       = courses_studied,
        NotesCreated         = notes_created,
        NotesViewed          = notes_viewed,
        QuizzesGenerated     = quizzes_generated,
        GoalCompletionPercent= goal_percent,
        WeeklyGoalMinutes    = goal_minutes,
        MinutesDelta         = minutes_delta,
        PercentChange        = round(percent_change, 2),
        ReportData           = json.dumps(report_data),
    )
    db.session.add(report)
    db.session.commit()

    # ── In-app notification ───────────────────────────────────────────────────
    try:
        week_label = week_start.strftime("%b %d")
        create_notification_for_user(
            user_id=user_id,
            title="📊 Weekly report ready",
            message=(
                f"Your week of {week_label}: "
                f"{round(total_minutes/60, 1)}h studied, "
                f"{session_count} sessions, {goal_percent}% of goal. Tap to view."
            ),
            ntype="weekly_report",
        )
        db.session.commit()
    except Exception as exc:
        print(f"[reports] notification error (non-fatal): {exc}")

    return report


# ── GET /api/reports/test ────────────────────────────────────────────────────

@reports_bp.route("/api/reports/test", methods=["GET"])
def test_weekly_reports_table():
    """
    Smoke-test endpoint — verifies the WeeklyReports table is reachable
    and returns a count of existing rows.  No authentication required so
    it can be hit with a plain curl during deploy verification.
    """
    try:
        count = WeeklyReport.query.count()
        return {
            "status":       "success",
            "message":      "WeeklyReports table is accessible",
            "reportCount":  count,
            "tableExists":  True,
        }, 200
    except Exception as exc:
        return {
            "status":      "error",
            "message":     str(exc),
            "tableExists": False,
        }, 500


# ── Date helpers ──────────────────────────────────────────────────────────────

def _last_completed_week() -> tuple[date, date]:
    """Return (monday, sunday) of the most-recently-completed week."""
    today      = date.today()
    # Monday of the current week
    this_monday = today - timedelta(days=today.weekday())
    last_monday = this_monday - timedelta(weeks=1)
    last_sunday = last_monday + timedelta(days=6)
    return last_monday, last_sunday


# ── GET /api/reports/weekly/latest ───────────────────────────────────────────

@reports_bp.route("/api/reports/weekly/latest", methods=["GET"])
def get_latest_weekly_report():
    """
    Return the most recent weekly report.
    Auto-generates the previous week's report if it doesn't exist yet.
    """
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    last_monday, last_sunday = _last_completed_week()

    # Auto-generate if missing (lazy cron substitute)
    is_new  = False
    existing = WeeklyReport.query.filter_by(
        UserID=user_id, WeekStartDate=last_monday
    ).first()

    if not existing:
        # Only generate if user has any activity that week
        start_dt = datetime(last_monday.year, last_monday.month, last_monday.day,
                            tzinfo=timezone.utc)
        end_dt   = datetime(last_sunday.year, last_sunday.month, last_sunday.day,
                            23, 59, 59, tzinfo=timezone.utc)
        has_activity = StudySession.query.filter(
            StudySession.UserID    == user_id,
            StudySession.StartTime >= start_dt,
            StudySession.StartTime <= end_dt,
        ).first() is not None

        if has_activity:
            existing = _generate_report(user_id, last_monday, last_sunday)
            is_new   = True

    # Return most-recent report (might be older than last week if user just started)
    report = (
        WeeklyReport.query
        .filter_by(UserID=user_id)
        .order_by(WeeklyReport.WeekStartDate.desc())
        .first()
    )

    if not report:
        return {"report": None, "isNew": False}, 200

    return {"report": _serialize_report(report, is_new=is_new), "isNew": is_new}, 200


# ── GET /api/reports/weekly ───────────────────────────────────────────────────

@reports_bp.route("/api/reports/weekly", methods=["GET"])
def list_weekly_reports():
    """Return all weekly reports for the authenticated user (newest first)."""
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    limit   = min(request.args.get("limit", 12, type=int), 52)
    reports = (
        WeeklyReport.query
        .filter_by(UserID=user_id)
        .order_by(WeeklyReport.WeekStartDate.desc())
        .limit(limit)
        .all()
    )

    return {"reports": [_serialize_report(r) for r in reports]}, 200


# ── POST /api/reports/weekly/generate ────────────────────────────────────────

@reports_bp.route("/api/reports/weekly/generate", methods=["POST"])
def generate_weekly_report():
    """
    Explicitly generate (or re-generate) a weekly report.
    Body (optional): { "weekOffset": 1 }  — 1 = last week, 2 = 2 weeks ago …
    """
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data        = request.get_json() or {}
    week_offset = max(1, int(data.get("weekOffset", 1)))  # must be at least 1

    today       = date.today()
    this_monday = today - timedelta(days=today.weekday())
    week_start  = this_monday - timedelta(weeks=week_offset)
    week_end    = week_start + timedelta(days=6)

    # Delete existing report for that week so we can regenerate cleanly
    old = WeeklyReport.query.filter_by(UserID=user_id, WeekStartDate=week_start).first()
    if old:
        db.session.delete(old)
        db.session.commit()

    report = _generate_report(user_id, week_start, week_end)

    # ── Mock email ────────────────────────────────────────────────────────────
    try:
        report_data = json.loads(report.ReportData) if report.ReportData else {}
        email_preview = _mock_send_email(user_id, report, report_data)
        # Stamp SentAt so the DB records when the (mock) email went out
        report.SentAt = datetime.now(timezone.utc)
        db.session.commit()
    except Exception as exc:
        print(f"[reports] mock email error (non-fatal): {exc}")
        email_preview = None

    return {
        "report": _serialize_report(report, is_new=True),
        "isNew": True,
        "emailPreview": email_preview,
    }, 201
