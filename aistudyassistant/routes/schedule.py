from datetime import datetime, date as date_type, time as time_type, timezone

from flask import Blueprint, request, session

from aistudyassistant.extensions import db
from aistudyassistant.models.schedule_event import ScheduleEvent


schedule_bp = Blueprint("schedule", __name__)

VALID_TYPES   = {"school", "work", "personal"}
VALID_REPEATS = {"once", "daily", "weekly", "monthly"}


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


# ── GET all events for current user 

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


# ── POST create a new event 

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

    # Validate required fields
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


# ── PUT update an existing event 

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


# ── DELETE an event 

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
