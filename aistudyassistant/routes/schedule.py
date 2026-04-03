import io
import json
import os
import re
from datetime import datetime, date as date_type, time as time_type, timezone

import google.generativeai as genai
from flask import Blueprint, request, session

from aistudyassistant.extensions import db
from aistudyassistant.models.course import Course
from aistudyassistant.models.schedule_event import ScheduleEvent


schedule_bp = Blueprint("schedule", __name__)

VALID_TYPES   = {"school", "work", "personal"}
VALID_REPEATS = {"once", "daily", "weekly", "monthly"}

_GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if _GEMINI_KEY:
    genai.configure(api_key=_GEMINI_KEY)

COURSE_COLORS = [
    "#667eea", "#f093fb", "#4facfe", "#43e97b",
    "#ff6b6b", "#ffd648", "#0fd850", "#fa8231",
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _current_user_id():
    return session.get("user_id")


def _serialize_event(ev: ScheduleEvent):
    return {
        "eventID":   ev.EventID,
        "userID":    ev.UserID,
        "title":     ev.Title,
        "location":  ev.Location,
        "type":      ev.Type,
        "color":     ev.Color,
        "repeat":    ev.Repeat,
        "days":      ev.get_days(),
        "startTime": ev.StartTime.strftime("%H:%M") if ev.StartTime else None,
        "endTime":   ev.EndTime.strftime("%H:%M")   if ev.EndTime   else None,
        "startDate": ev.StartDate.isoformat()       if ev.StartDate else None,
        "endDate":   ev.EndDate.isoformat()         if ev.EndDate   else None,
        "createdAt": ev.CreatedAt.isoformat()       if ev.CreatedAt else None,
    }


def _parse_time(val):
    """Parse 'HH:MM' or 'HH:MM:SS' string into a time object."""
    if not val:
        return None
    try:
        parts = str(val).split(":")
        return time_type(int(parts[0]), int(parts[1]))
    except (ValueError, TypeError, IndexError):
        return None


def _parse_date(val):
    """Parse ISO date string 'YYYY-MM-DD' into a date object."""
    if not val:
        return None
    try:
        return date_type.fromisoformat(str(val))
    except (ValueError, TypeError):
        return None


def pick_course_icon(course_name: str) -> str:
    """Return an appropriate emoji icon based on course name keywords."""
    name = course_name.lower()

    if any(w in name for w in ["cs", "computer", "programming", "software", "coding", "python", "java", "web", "algorithm"]):
        return "💻"
    if any(w in name for w in ["math", "calculus", "algebra", "geometry", "statistics", "stat", "linear"]):
        return "🧮"
    if any(w in name for w in ["data", "database", "sql", "analytics", "machine learning", "ai", "artificial"]):
        return "🗄️"
    if any(w in name for w in ["chem", "chemistry", "organic", "molecular"]):
        return "⚗️"
    if any(w in name for w in ["physics", "quantum", "mechanics"]):
        return "🔬"
    if any(w in name for w in ["bio", "biology", "anatomy", "ecology", "genetics"]):
        return "🧬"
    if any(w in name for w in ["business", "economics", "finance", "accounting", "marketing", "management"]):
        return "📊"
    if any(w in name for w in ["art", "design", "graphic", "visual", "studio"]):
        return "🎨"
    if any(w in name for w in ["english", "literature", "writing", "composition", "rhetoric"]):
        return "📖"
    if any(w in name for w in ["history", "government", "politics", "sociology", "anthropology"]):
        return "🏛️"
    if any(w in name for w in ["music", "theater", "theatre", "drama", "performance"]):
        return "🎭"
    if any(w in name for w in ["engineering", "mechanical", "electrical", "civil", "structural"]):
        return "⚙️"
    if "lab" in name:
        return "🔬"
    return "📚"


def _infer_semester(start_date_str: str):
    """Return (semester_string, year_int) inferred from a YYYY-MM-DD date string."""
    if not start_date_str:
        return "", None
    try:
        d = datetime.strptime(start_date_str, "%Y-%m-%d")
        year = d.year
        month = d.month
        if 1 <= month <= 5:
            return f"Spring {year}", year
        elif 6 <= month <= 8:
            return f"Summer {year}", year
        else:
            return f"Fall {year}", year
    except Exception:
        return "", None


def _extract_course_code(class_name: str) -> str:
    """Try to extract a course code from the class name.

    Examples:
        'CS201 - Data Structures' → 'CS201'
        'MATH 301 - Calculus II'  → 'MATH 301'
        'Introduction to Biology' → ''
    """
    # Pattern: letters + optional space + digits at the start (e.g. CS201, MATH 301)
    m = re.match(r'^([A-Za-z]{2,6}\s*\d{2,4})', class_name.strip())
    if m:
        return m.group(1).strip()

    # Fallback: take text before ' - ' and check if it looks like a code
    if " - " in class_name:
        potential = class_name.split(" - ")[0].strip()
        if any(c.isalpha() for c in potential) and any(c.isdigit() for c in potential):
            return potential
    return ""


def _gemini_parse_schedule(text: str, schedule_type: str) -> list:
    """Call Gemini to parse raw schedule text into structured events."""
    if not _GEMINI_KEY:
        return []

    today = datetime.now().strftime("%Y-%m-%d")
    prompt = f"""You are a schedule parser. Extract all schedule events from the text below.

Schedule type: {schedule_type}
Today's date: {today}

Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[
  {{
    "name": "Course/Event Name",
    "location": "Room or location (empty string if not mentioned)",
    "days": ["Monday", "Wednesday"],
    "startTime": "09:00",
    "endTime": "10:30",
    "startDate": "{today}",
    "endDate": null,
    "repeat": "weekly",
    "color": "#667eea"
  }}
]

Rules:
- days must use full names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- startTime and endTime must be in HH:MM 24-hour format
- startDate must be YYYY-MM-DD (use today if not specified)
- repeat must be one of: once, daily, weekly, monthly
- If a class meets multiple days per week, use repeat: "weekly" and list all days
- color should cycle through: #667eea, #f093fb, #4facfe, #43e97b, #ff6b6b
- Return [] if no events can be extracted

Schedule text:
{text}"""

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        events = json.loads(raw)
        return events if isinstance(events, list) else []
    except Exception as e:
        print(f"Gemini schedule parse error: {e}")
        return []


# ── GET all events ────────────────────────────────────────────────────────────

@schedule_bp.route("/api/schedule/events", methods=["GET"])
def get_events():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    events = (
        ScheduleEvent.query
        .filter_by(UserID=user_id)
        .order_by(ScheduleEvent.StartDate.asc(), ScheduleEvent.StartTime.asc())
        .all()
    )
    return {"events": [_serialize_event(ev) for ev in events]}, 200


# ── POST create a single event ────────────────────────────────────────────────

@schedule_bp.route("/api/schedule/events", methods=["POST"])
def create_event():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data = request.get_json() or {}

    title      = (data.get("title") or "").strip()
    location   = (data.get("location") or "").strip() or None
    event_type = (data.get("type") or "school").strip().lower()
    color      = (data.get("color") or "#667eea").strip()
    repeat     = (data.get("repeat") or "once").strip().lower()
    days       = data.get("days") or []
    start_time = _parse_time(data.get("startTime"))
    end_time   = _parse_time(data.get("endTime"))
    start_date = _parse_date(data.get("startDate"))
    end_date   = _parse_date(data.get("endDate"))

    if not title:
        return {"error": "title is required"}, 400
    if not start_time:
        return {"error": "startTime is required (HH:MM)"}, 400
    if not end_time:
        return {"error": "endTime is required (HH:MM)"}, 400
    if not start_date:
        return {"error": "startDate is required (YYYY-MM-DD)"}, 400
    if event_type not in VALID_TYPES:
        return {"error": f"type must be one of: {', '.join(VALID_TYPES)}"}, 400
    if repeat not in VALID_REPEATS:
        return {"error": f"repeat must be one of: {', '.join(VALID_REPEATS)}"}, 400

    ev = ScheduleEvent(
        UserID=user_id,
        Title=title,
        Location=location,
        Type=event_type,
        Color=color,
        Repeat=repeat,
        StartTime=start_time,
        EndTime=end_time,
        StartDate=start_date,
        EndDate=end_date,
    )
    ev.set_days(days if isinstance(days, list) else [])

    db.session.add(ev)
    db.session.commit()

    return {"message": "Event created", "event": _serialize_event(ev)}, 201


# ── PUT update an existing event ──────────────────────────────────────────────

@schedule_bp.route("/api/schedule/events/<int:event_id>", methods=["PUT"])
def update_event(event_id):
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    ev = ScheduleEvent.query.filter_by(EventID=event_id, UserID=user_id).first()
    if not ev:
        return {"error": "Event not found"}, 404

    data = request.get_json() or {}

    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return {"error": "title cannot be empty"}, 400
        ev.Title = title

    if "location" in data:
        ev.Location = (data["location"] or "").strip() or None

    if "type" in data:
        t = (data["type"] or "").strip().lower()
        if t not in VALID_TYPES:
            return {"error": f"type must be one of: {', '.join(VALID_TYPES)}"}, 400
        ev.Type = t

    if "color"  in data: ev.Color  = data["color"]
    if "repeat" in data:
        r = (data["repeat"] or "").strip().lower()
        if r not in VALID_REPEATS:
            return {"error": f"repeat must be one of: {', '.join(VALID_REPEATS)}"}, 400
        ev.Repeat = r

    if "days"      in data: ev.set_days(data["days"] if isinstance(data["days"], list) else [])
    if "startTime" in data:
        t = _parse_time(data["startTime"])
        if not t:
            return {"error": "startTime must be HH:MM"}, 400
        ev.StartTime = t
    if "endTime"   in data:
        t = _parse_time(data["endTime"])
        if not t:
            return {"error": "endTime must be HH:MM"}, 400
        ev.EndTime = t
    if "startDate" in data:
        d = _parse_date(data["startDate"])
        if not d:
            return {"error": "startDate must be YYYY-MM-DD"}, 400
        ev.StartDate = d
    if "endDate"   in data:
        ev.EndDate = _parse_date(data["endDate"])

    ev.UpdatedAt = datetime.now(timezone.utc)
    db.session.commit()

    return {"message": "Event updated", "event": _serialize_event(ev)}, 200


# ── DELETE an event ───────────────────────────────────────────────────────────

@schedule_bp.route("/api/schedule/events/<int:event_id>", methods=["DELETE"])
def delete_event(event_id):
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    ev = ScheduleEvent.query.filter_by(EventID=event_id, UserID=user_id).first()
    if not ev:
        return {"error": "Event not found"}, 404

    db.session.delete(ev)
    db.session.commit()

    return {"message": "Event deleted"}, 200


# ── POST /api/schedules — batch save schedule + auto-create courses ───────────

@schedule_bp.route("/api/schedules", methods=["POST"])
def save_schedule_batch():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data          = request.get_json() or {}
    schedule_type = (data.get("scheduleType") or "school").strip().lower()
    events        = data.get("events") or []

    if not events:
        return {"error": "No events provided"}, 400
    if schedule_type not in VALID_TYPES:
        return {"error": f"scheduleType must be one of: {', '.join(VALID_TYPES)}"}, 400

    # ── Save all events ──────────────────────────────────────────────────────
    saved_events = []
    for raw in events:
        title      = (raw.get("title") or raw.get("name") or "").strip()
        location   = (raw.get("location") or "").strip() or None
        color      = (raw.get("color") or "#667eea").strip()
        repeat     = (raw.get("repeat") or "once").strip().lower()
        days       = raw.get("days") or []
        start_time = _parse_time(raw.get("startTime"))
        end_time   = _parse_time(raw.get("endTime"))
        start_date = _parse_date(raw.get("startDate"))
        end_date   = _parse_date(raw.get("endDate"))

        if not title or not start_time or not end_time or not start_date:
            continue  # skip malformed events silently
        if repeat not in VALID_REPEATS:
            repeat = "once"

        ev = ScheduleEvent(
            UserID=user_id,
            Title=title,
            Location=location,
            Type=schedule_type,
            Color=color,
            Repeat=repeat,
            StartTime=start_time,
            EndTime=end_time,
            StartDate=start_date,
            EndDate=end_date,
        )
        ev.set_days(days if isinstance(days, list) else [])
        db.session.add(ev)
        saved_events.append(raw)

    db.session.commit()

    # ── AUTO-CREATE COURSES for school-type schedules ────────────────────────
    courses_created      = 0
    course_names_created = []

    if schedule_type == "school":
        # Collect one representative event per unique class name
        unique_classes = {}
        for event in saved_events:
            class_name = (event.get("title") or event.get("name") or "").strip()
            if class_name and class_name not in unique_classes:
                unique_classes[class_name] = event

        for idx, (class_name, first_event) in enumerate(unique_classes.items()):
            # Skip if course already exists for this user
            existing = Course.query.filter_by(
                UserID=user_id,
                CourseName=class_name,
            ).first()
            if existing:
                continue

            # Extract course code from title
            course_code = _extract_course_code(class_name)

            # Infer semester from start date
            start_date_str = first_event.get("startDate")
            semester, _ = _infer_semester(start_date_str)

            # Pick smart icon
            icon = pick_course_icon(class_name)

            # Color: use event color, fall back to rotating palette
            color = first_event.get("color") or COURSE_COLORS[idx % len(COURSE_COLORS)]

            new_course = Course(
                UserID=user_id,
                CourseName=class_name,
                CourseCode=course_code,
                Semester=semester,
                Color=color,
                Icon=icon,
                StartDate=_parse_date(start_date_str),
                EndDate=_parse_date(first_event.get("endDate")),
            )
            db.session.add(new_course)
            courses_created += 1
            course_names_created.append(class_name)

        if courses_created > 0:
            db.session.commit()

    return {
        "message":      "Schedule saved successfully",
        "eventsCreated": len(saved_events),
        "coursesCreated": courses_created,
        "courseNames":   course_names_created,
    }, 201


# ── POST /api/schedules/extract — extract events from uploaded file ───────────

@schedule_bp.route("/api/schedules/extract", methods=["POST"])
def extract_schedule_from_file():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    if "file" not in request.files:
        return {"error": "No file provided"}, 400

    uploaded = request.files["file"]
    schedule_type = (request.form.get("scheduleType") or "school").strip().lower()
    filename = (uploaded.filename or "").lower()

    extracted_text = None

    # ── ICS files: parse directly ────────────────────────────────────────────
    if filename.endswith(".ics"):
        raw = uploaded.read().decode("utf-8", errors="ignore")
        # Build a simple text summary Gemini can parse
        extracted_text = raw

    # ── PDF / DOCX / TXT: extract text ──────────────────────────────────────
    elif filename.endswith(".pdf"):
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(uploaded.read()))
            extracted_text = "\n".join(p.extract_text() or "" for p in reader.pages).strip()
        except Exception as e:
            print(f"PDF extract error: {e}")

    elif filename.endswith(".docx"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(uploaded.read()))
            extracted_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            print(f"DOCX extract error: {e}")

    elif filename.endswith((".txt", ".md")):
        extracted_text = uploaded.read().decode("utf-8", errors="ignore")

    # ── Images: use Gemini vision ────────────────────────────────────────────
    elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
        if not _GEMINI_KEY:
            return {"error": "AI service not configured"}, 503
        try:
            img_bytes = uploaded.read()
            ext = filename.rsplit(".", 1)[-1]
            mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
            today = datetime.now().strftime("%Y-%m-%d")
            prompt = (
                f"Extract all schedule/class/shift events from this image. "
                f"Return ONLY a JSON array with fields: name, days (full names), "
                f"startTime (HH:MM), endTime (HH:MM), startDate ({today} if unknown), "
                f"endDate (null if unknown), location, repeat (once/weekly/daily/monthly), "
                f"color (#667eea). No markdown, no explanation."
            )
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content([
                {"mime_type": mime, "data": img_bytes},
                prompt,
            ])
            raw = re.sub(r"^```(?:json)?\s*", "", response.text.strip())
            raw = re.sub(r"\s*```$", "", raw)
            events = json.loads(raw)
            return {"events": events if isinstance(events, list) else []}, 200
        except Exception as e:
            print(f"Vision extract error: {e}")
            return {"error": f"Could not extract schedule from image: {str(e)}"}, 422

    else:
        return {"error": "Unsupported file type. Use PDF, DOCX, TXT, PNG, JPG, or ICS."}, 415

    if not extracted_text or not extracted_text.strip():
        return {"error": "Could not read text from the file."}, 422

    if not _GEMINI_KEY:
        return {"error": "AI service not configured"}, 503

    events = _gemini_parse_schedule(extracted_text, schedule_type)
    return {"events": events}, 200


# ── POST /api/schedules/parse-text — parse pasted schedule text via AI ────────

@schedule_bp.route("/api/schedules/parse-text", methods=["POST"])
def parse_schedule_text():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    if not _GEMINI_KEY:
        return {"error": "AI service not configured"}, 503

    data          = request.get_json() or {}
    text          = (data.get("text") or "").strip()
    schedule_type = (data.get("scheduleType") or "school").strip().lower()

    if not text:
        return {"error": "text is required"}, 400

    events = _gemini_parse_schedule(text, schedule_type)
    return {"events": events}, 200
