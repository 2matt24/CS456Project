import io
import json
import os
import re
from datetime import datetime, date as date_type, time as time_type, timezone

from google import genai
from google.genai import types as genai_types
from flask import Blueprint, request

from aistudyassistant.extensions import db
from aistudyassistant.models.course import Course
from aistudyassistant.models.schedule_event import ScheduleEvent
from aistudyassistant.services.auth_tokens import get_authenticated_user_id


schedule_bp = Blueprint("schedule", __name__)

VALID_TYPES   = {"school", "work", "personal"}
VALID_REPEATS = {"once", "daily", "weekly", "monthly"}

_GEMINI_KEY    = (os.getenv("GEMINI_API_KEY") or "").strip()
_gemini_client = genai.Client(api_key=_GEMINI_KEY) if _GEMINI_KEY else None

COURSE_COLORS = [
    "#667eea", "#f093fb", "#4facfe", "#43e97b",
    "#ff6b6b", "#ffd648", "#0fd850", "#fa8231",
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _current_user_id():
    #return session.get("user_id")
    return get_authenticated_user_id()


def _serialize_event(ev: ScheduleEvent):
    return {
        "eventID":          ev.EventID,
        "userID":           ev.UserID,
        "title":            ev.Title,
        "location":         ev.Location,
        "type":             ev.Type,
        "color":            ev.Color,
        "repeat":           ev.Repeat,
        "days":             ev.get_days(),
        "startTime":        ev.StartTime.strftime("%H:%M") if ev.StartTime else None,
        "endTime":          ev.EndTime.strftime("%H:%M")   if ev.EndTime   else None,
        "startDate":        ev.StartDate.isoformat()       if ev.StartDate else None,
        "endDate":          ev.EndDate.isoformat()         if ev.EndDate   else None,
        "createdAt":        ev.CreatedAt.isoformat()       if ev.CreatedAt else None,
        "uploadedFileName": ev.UploadedFileName,
        "uploadedFileUrl":  ev.UploadedFileUrl,
        "uploadedFileType": ev.UploadedFileType,
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


# ── In-memory cache: course name → extracted info ─────────────────────────────
# Survives the lifetime of the Render worker process.
# If the same class name appears across multiple users' uploads, only the
# first one ever hits the Gemini API; everyone else gets the cached result.
_course_info_cache: dict = {}


def _fallback_course_info(class_name: str) -> dict:
    """Regex-based fallback when Gemini is unavailable or fails."""
    code = ""
    m = re.match(r"^([A-Za-z]{2,6}\s*\d{2,4}[A-Za-z]?)", class_name.strip())
    if m:
        code = m.group(1).strip()
    elif " - " in class_name:
        potential = class_name.split(" - ")[0].strip()
        if any(c.isalpha() for c in potential) and any(c.isdigit() for c in potential):
            code = potential
    return {
        "course_code": code,
        "clean_name": class_name.split(" - ")[-1].strip() if " - " in class_name else class_name,
        "icon": "📚",
        "subject_area": "General",
    }


def extract_multiple_courses_with_ai(names_and_dates: list) -> dict:
    """Send ALL unique class names in ONE Gemini call and return a name→info map.

    Args:
        names_and_dates: list of (class_name, start_date_str) tuples

    Returns:
        dict mapping class_name → {course_code, clean_name, icon, subject_area}
    """
    # Split into cached vs uncached
    result_map = {}
    to_fetch = []

    for name, date in names_and_dates:
        if name in _course_info_cache:
            result_map[name] = _course_info_cache[name]
        else:
            to_fetch.append((name, date))

    if not to_fetch:
        return result_map  # 100% cache hit — zero API calls

    if not _gemini_client:
        for name, _ in to_fetch:
            info = _fallback_course_info(name)
            result_map[name] = info
            _course_info_cache[name] = info
        return result_map

    # Build a single batch prompt for all uncached names
    courses_json = json.dumps(
        [{"name": n, "startDate": d or ""} for n, d in to_fetch],
        ensure_ascii=False,
    )
    prompt = f"""Analyze these course/class names and extract structured information.

Courses:
{courses_json}

Return ONLY a JSON array (no markdown, no explanation) with one object per course, in the same order:
[
  {{
    "course_code": "extracted code if present (e.g. CS201, MATH 301) or empty string",
    "clean_name": "cleaned name without code prefix",
    "icon": "single emoji representing the subject",
    "subject_area": "subject category"
  }}
]

Examples:
"CS201 - Data Structures" → {{"course_code": "CS201", "clean_name": "Data Structures", "icon": "💻", "subject_area": "Computer Science"}}
"Introduction to Biology" → {{"course_code": "", "clean_name": "Introduction to Biology", "icon": "🧬", "subject_area": "Biology"}}
"MATH 301 Calculus II"   → {{"course_code": "MATH 301", "clean_name": "Calculus II", "icon": "🧮", "subject_area": "Mathematics"}}
"Studio Art 2D Design"   → {{"course_code": "", "clean_name": "Studio Art 2D Design", "icon": "🎨", "subject_area": "Art"}}
"""

    try:
        response = _gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        parsed = json.loads(raw)

        required_keys = {"course_code", "clean_name", "icon", "subject_area"}
        if isinstance(parsed, list) and len(parsed) == len(to_fetch):
            for (name, _), info in zip(to_fetch, parsed):
                if isinstance(info, dict) and required_keys.issubset(info):
                    _course_info_cache[name] = info
                    result_map[name] = info
                else:
                    # Partial failure — fallback for this entry
                    info = _fallback_course_info(name)
                    _course_info_cache[name] = info
                    result_map[name] = info
            print(f"Batch AI extraction: {len(to_fetch)} courses in 1 API call")
            return result_map

    except Exception as e:
        print(f"Gemini batch course extraction error: {e}")

    # Full fallback — Gemini failed entirely
    for name, _ in to_fetch:
        info = _fallback_course_info(name)
        _course_info_cache[name] = info
        result_map[name] = info

    return result_map


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


def _gemini_parse_schedule(text: str, schedule_type: str) -> list:
    """Call Gemini to parse raw schedule text into structured events."""
    if not _gemini_client:
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
        response = _gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
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
    file_metadata = data.get("fileMetadata")  # optional — present when uploaded via file

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
            UploadedFileName=file_metadata.get("fileName") if file_metadata else None,
            UploadedFileUrl=file_metadata.get("fileUrl")   if file_metadata else None,
            UploadedFileType=file_metadata.get("fileType") if file_metadata else None,
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

        # ONE batch Gemini call for all unique class names (cache handles repeats)
        names_and_dates = [
            (name, ev.get("startDate")) for name, ev in unique_classes.items()
        ]
        course_info_map = extract_multiple_courses_with_ai(names_and_dates)

        for idx, (class_name, first_event) in enumerate(unique_classes.items()):
            # Skip if course already exists for this user
            existing = Course.query.filter_by(
                UserID=user_id,
                CourseName=class_name,
            ).first()
            if existing:
                continue

            start_date_str = first_event.get("startDate")
            course_info    = course_info_map.get(class_name, _fallback_course_info(class_name))
            semester, _    = _infer_semester(start_date_str)
            color          = first_event.get("color") or COURSE_COLORS[idx % len(COURSE_COLORS)]

            new_course = Course(
                UserID=user_id,
                CourseName=class_name,
                CourseCode=course_info["course_code"],
                Semester=semester,
                Color=color,
                Icon=course_info["icon"],
                StartDate=_parse_date(start_date_str),
                EndDate=_parse_date(first_event.get("endDate")),
            )
            db.session.add(new_course)
            courses_created += 1
            course_names_created.append(class_name)
            print(
                f"AI-created course: {class_name} → "
                f"Code: {course_info['course_code']}, "
                f"Icon: {course_info['icon']}, "
                f"Subject: {course_info['subject_area']}"
            )

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
    original_filename = uploaded.filename or "schedule"
    filename = original_filename.lower()

    # Read all bytes upfront so we can reuse them for both extraction and Azure upload
    file_bytes = uploaded.read()
    file_ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"

    # ── Upload original file to Azure Blob Storage (non-fatal) ───────────────
    file_metadata = None
    try:
        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        if conn_str:
            import uuid
            from azure.storage.blob import BlobServiceClient
            from werkzeug.utils import secure_filename
            safe_name = secure_filename(original_filename)
            blob_name = f"schedules/{user_id}/{uuid.uuid4()}_{safe_name}"
            blob_svc  = BlobServiceClient.from_connection_string(conn_str)
            blob_client = blob_svc.get_blob_client(container="notes-files", blob=blob_name)
            blob_client.upload_blob(io.BytesIO(file_bytes), overwrite=True)
            file_metadata = {
                "fileName": original_filename,
                "fileUrl":  blob_client.url,
                "fileType": file_ext,
            }
            print(f"Schedule file stored in Azure: {blob_client.url}")
    except Exception as e:
        print(f"Schedule Azure upload failed (non-fatal): {e}")

    extracted_text = None

    # ── ICS files: parse directly ────────────────────────────────────────────
    if filename.endswith(".ics"):
        extracted_text = file_bytes.decode("utf-8", errors="ignore")

    # ── PDF / DOCX / TXT: extract text ──────────────────────────────────────
    elif filename.endswith(".pdf"):
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            extracted_text = "\n".join(p.extract_text() or "" for p in reader.pages).strip()
        except Exception as e:
            print(f"PDF extract error: {e}")

        # Image-based / scanned PDF — fall back to Gemini vision
        if (not extracted_text or not extracted_text.strip()) and _gemini_client:
            try:
                today = datetime.now().strftime("%Y-%m-%d")
                vision_prompt = (
                    f"Extract all schedule/class/shift events from this PDF. "
                    f"Return ONLY a JSON array with fields: name, days (full day names), "
                    f"startTime (HH:MM 24-hour), endTime (HH:MM 24-hour), "
                    f"startDate ({today} if unknown), endDate (null if unknown), "
                    f"location, repeat (once/weekly/daily/monthly), color (#667eea). "
                    f"No markdown, no explanation."
                )
                vision_response = _gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[
                        genai_types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"),
                        genai_types.Part.from_text(vision_prompt),
                    ],
                )
                raw = re.sub(r"^```(?:json)?\s*", "", vision_response.text.strip())
                raw = re.sub(r"\s*```$", "", raw)
                events = json.loads(raw)
                return {"events": events if isinstance(events, list) else [], "fileMetadata": file_metadata}, 200
            except Exception as e:
                print(f"PDF vision extract error: {e}")

    elif filename.endswith(".docx"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            extracted_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            print(f"DOCX extract error: {e}")

    elif filename.endswith((".txt", ".md")):
        extracted_text = file_bytes.decode("utf-8", errors="ignore")

    # ── Images: use Gemini vision ────────────────────────────────────────────
    elif filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
        if not _gemini_client:
            return {"error": "AI service not configured"}, 503
        try:
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
            response = _gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    genai_types.Part.from_bytes(data=file_bytes, mime_type=mime),
                    genai_types.Part.from_text(prompt),
                ],
            )
            raw = re.sub(r"^```(?:json)?\s*", "", response.text.strip())
            raw = re.sub(r"\s*```$", "", raw)
            events = json.loads(raw)
            return {"events": events if isinstance(events, list) else [], "fileMetadata": file_metadata}, 200
        except Exception as e:
            print(f"Vision extract error: {e}")
            return {"error": f"Could not extract schedule from image: {str(e)}"}, 422

    else:
        return {"error": "Unsupported file type. Use PDF, DOCX, TXT, PNG, JPG, or ICS."}, 415

    if not extracted_text or not extracted_text.strip():
        return {"error": "Could not read text from the file. If this is a scanned or image-based PDF, try uploading a PNG/JPG image of the schedule instead."}, 422

    if not _gemini_client:
        return {"error": "AI service not configured"}, 503

    events = _gemini_parse_schedule(extracted_text, schedule_type)
    return {"events": events, "fileMetadata": file_metadata}, 200


# ── POST /api/schedules/parse-text — parse pasted schedule text via AI ────────

@schedule_bp.route("/api/schedules/parse-text", methods=["POST"])
def parse_schedule_text():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    if not _gemini_client:
        return {"error": "AI service not configured"}, 503

    data          = request.get_json() or {}
    text          = (data.get("text") or "").strip()
    schedule_type = (data.get("scheduleType") or "school").strip().lower()

    if not text:
        return {"error": "text is required"}, 400

    events = _gemini_parse_schedule(text, schedule_type)
    return {"events": events}, 200
