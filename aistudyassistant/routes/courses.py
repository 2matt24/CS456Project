from datetime import date as date_type

#from flask import Blueprint, request, session
from flask import Blueprint, request

from aistudyassistant.extensions import db
from aistudyassistant.models.course import Course
from aistudyassistant.models.schedule_event import ScheduleEvent
from aistudyassistant.services.auth_tokens import get_authenticated_user_id


courses_bp = Blueprint("courses", __name__)


def _current_user_id():
    #return session.get("user_id")
    return get_authenticated_user_id()


def _serialize_course(course: Course):
    return {
        "courseID":   course.CourseID,
        "userID":     course.UserID,
        "courseName": course.CourseName,
        "courseCode": course.CourseCode,
        "semester":   course.Semester,
        "color":      course.Color,
        "icon":       course.Icon,
        "startDate":  course.StartDate.isoformat()  if course.StartDate  else None,
        "endDate":    course.EndDate.isoformat()    if course.EndDate    else None,
        "createdAt":  course.CreatedAt.isoformat()  if course.CreatedAt  else None,
    }


@courses_bp.route("/api/courses", methods=["GET"])
def get_courses():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    courses = (
        Course.query.filter_by(UserID=user_id)
        .order_by(Course.CourseName.asc())
        .all()
    )
    return {"courses": [_serialize_course(course) for course in courses]}, 200


@courses_bp.route("/api/courses", methods=["POST"])
def create_course():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data = request.get_json() or {}
    course_name = (data.get("courseName") or "").strip()
    course_code = (data.get("courseCode") or "").strip() or None
    semester    = (data.get("semester")   or "").strip() or None
    color       = (data.get("color")      or "#667eea").strip()
    icon        = (data.get("icon")       or "📚").strip()

    # Optional date fields (ISO format YYYY-MM-DD)
    def _parse_date(val):
        try:
            from datetime import date
            return date.fromisoformat(val) if val else None
        except (ValueError, TypeError):
            return None

    start_date = _parse_date(data.get("startDate"))
    end_date   = _parse_date(data.get("endDate"))

    if not course_name:
        return {"error": "courseName is required"}, 400

    course = Course(
        UserID=user_id,
        CourseName=course_name,
        CourseCode=course_code,
        Semester=semester,
        Color=color,
        Icon=icon,
        StartDate=start_date,
        EndDate=end_date,
    )

    db.session.add(course)
    db.session.commit()

    return {"message": "Course created", "course": _serialize_course(course)}, 201


@courses_bp.route("/api/courses/<int:course_id>", methods=["PUT"])
def update_course(course_id):
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    course = Course.query.filter_by(CourseID=course_id, UserID=user_id).first()
    if not course:
        return {"error": "Course not found"}, 404

    data = request.get_json() or {}

    def _parse_date(val):
        try:
            from datetime import date
            return date.fromisoformat(val) if val else None
        except (ValueError, TypeError):
            return None

    if "courseName" in data:
        name = (data["courseName"] or "").strip()
        if not name:
            return {"error": "courseName cannot be empty"}, 400
        course.CourseName = name
    if "courseCode" in data:
        course.CourseCode = (data["courseCode"] or "").strip() or None
    if "semester"   in data:
        course.Semester = (data["semester"] or "").strip() or None
    if "color"      in data:
        course.Color = data["color"]
    if "icon"       in data:
        course.Icon = data["icon"]
    if "startDate"  in data:
        course.StartDate = _parse_date(data["startDate"])
    if "endDate"    in data:
        course.EndDate = _parse_date(data["endDate"])

    db.session.commit()
    return {"message": "Course updated", "course": _serialize_course(course)}, 200


@courses_bp.route("/api/courses/<int:course_id>", methods=["DELETE"])
def delete_course(course_id):
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    course = Course.query.filter_by(CourseID=course_id, UserID=user_id).first()
    if not course:
        return {"error": "Course not found"}, 404

    course_name = course.CourseName

    # Cascade-delete any school schedule events whose title matches this course name
    ScheduleEvent.query.filter_by(
        UserID=user_id,
        Title=course_name,
        Type="school",
    ).delete(synchronize_session=False)

    db.session.delete(course)
    db.session.commit()

    return {"message": "Course and related calendar events deleted"}, 200