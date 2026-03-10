from flask import Blueprint, request, session

from aistudyassistant.extensions import db
from aistudyassistant.models.course import Course
from aistudyassistant.models.study_session import StudySession


study_sessions_bp = Blueprint("study_sessions", __name__)


def _current_user_id():
    return session.get("user_id")


def _serialize_study_session(study_session: StudySession):
    return {
        "sessionID": study_session.SessionID,
        "userID": study_session.UserID,
        "courseID": study_session.CourseID,
        "sessionType": study_session.SessionType,
        "durationMinutes": study_session.DurationMinutes,
        "createdAt": study_session.CreatedAt.isoformat() if study_session.CreatedAt else None,
    }


@study_sessions_bp.route("/api/study-sessions", methods=["GET"])
def get_study_sessions():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    course_id = request.args.get("courseId", type=int)
    limit = request.args.get("limit", default=50, type=int)
    limit = min(max(limit, 1), 200)

    query = StudySession.query.filter_by(UserID=user_id)

    if course_id is not None:
        query = query.filter_by(CourseID=course_id)

    sessions = query.order_by(StudySession.CreatedAt.desc()).limit(limit).all()
    return {"sessions": [_serialize_study_session(item) for item in sessions]}, 200


@study_sessions_bp.route("/api/study-sessions", methods=["POST"])
def create_study_session():
    from datetime import datetime

    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data = request.get_json() or {}

    course_id = data.get("courseId")
    session_type = (data.get("sessionType") or "study").strip().lower()
    duration_minutes = data.get("durationMinutes")

    if not course_id:
        return {"error": "courseId is required"}, 400

    try:
        course_id = int(course_id)
    except (TypeError, ValueError):
        return {"error": "courseId must be an integer"}, 400

    try:
        duration_minutes = int(duration_minutes)
    except (TypeError, ValueError):
        return {"error": "durationMinutes must be an integer"}, 400

    if duration_minutes < 1 or duration_minutes > 600:
        return {"error": "durationMinutes must be between 1 and 600"}, 400

    if session_type not in {"study", "break"}:
        return {"error": "sessionType must be one of: study, break"}, 400

    owned_course = Course.query.filter_by(
        CourseID=course_id,
        UserID=user_id
    ).first()

    if not owned_course:
        return {"error": "Course not found"}, 404

    study_session = StudySession(
        UserID=user_id,
        CourseID=course_id,
        SessionType=session_type,
        DurationMinutes=duration_minutes,
        StartTime=datetime.utcnow(),
        CreatedAt=datetime.utcnow()
    )

    db.session.add(study_session)
    db.session.commit()

    return {
        "message": "Study session created",
        "session": _serialize_study_session(study_session),
    }, 201