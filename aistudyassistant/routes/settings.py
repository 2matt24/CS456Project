from flask import Blueprint, request, session

from aistudyassistant.extensions import db
from aistudyassistant.models.user import User

settings_bp = Blueprint("settings", __name__)


def _current_user_id():
    return session.get("user_id")


def _get_user_or_401():
    user_id = _current_user_id()
    if not user_id:
        return None, ({"error": "Authentication required"}, 401)
    user = User.query.get(user_id)
    if not user:
        return None, ({"error": "User not found"}, 404)
    return user, None


# ── GET notification settings 

@settings_bp.route("/api/settings/notifications", methods=["GET"])
def get_notification_settings():
    user, err = _get_user_or_401()
    if err:
        return err

    return {
        "notifications": {
            "studyReminders": bool(user.StudyRemindersEnabled),
            "noteSummaries":  bool(user.NoteSummariesEnabled),
            "weeklyReport":   bool(user.WeeklyReportEnabled),
        }
    }, 200


# ── PUT update notification settings 

@settings_bp.route("/api/settings/notifications", methods=["PUT"])
def update_notification_settings():
    user, err = _get_user_or_401()
    if err:
        return err

    data    = request.get_json() or {}
    updates = data.get("notifications", data)

    if not isinstance(updates, dict):
        return {"error": "notifications must be an object"}, 400

    ALLOWED_KEYS = {
        "studyReminders": "StudyRemindersEnabled",
        "noteSummaries":  "NoteSummariesEnabled",
        "weeklyReport":   "WeeklyReportEnabled",
    }

    for frontend_key, model_attr in ALLOWED_KEYS.items():
        if frontend_key in updates:
            value = updates[frontend_key]
            if not isinstance(value, bool):
                return {"error": f"{frontend_key} must be a boolean"}, 400
            setattr(user, model_attr, value)

    db.session.commit()

    return {
        "message": "Notification settings updated",
        "notifications": {
            "studyReminders": bool(user.StudyRemindersEnabled),
            "noteSummaries":  bool(user.NoteSummariesEnabled),
            "weeklyReport":   bool(user.WeeklyReportEnabled),
        }
    }, 200


# ── GET about

@settings_bp.route("/api/settings/about", methods=["GET"])
def get_about_settings():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    return {
        "appName":   "StudyBuddyAI",
        "version":   "1.0.0",
        "aiModel":   "Gemini 2.5 Flash",
        "techStack": "React + Flask",
        "contact":   "support@studybuddyai.app",
    }, 200
