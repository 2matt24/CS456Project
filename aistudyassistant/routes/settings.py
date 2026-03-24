from flask import Blueprint, request, session

settings_bp = Blueprint("settings", __name__)

_DEFAULT_NOTIFICATION_SETTINGS = {
    "studyReminders": True,
    "noteSummaries": True,
    "weeklyReport": False,
}


def _current_user_id():
    return session.get("user_id")


def _get_notification_settings():
    stored = session.get("notification_settings") or {}
    merged = dict(_DEFAULT_NOTIFICATION_SETTINGS)
    for key in _DEFAULT_NOTIFICATION_SETTINGS:
        if key in stored:
            merged[key] = bool(stored[key])
    return merged


@settings_bp.route("/api/settings/notifications", methods=["GET"])
def get_notification_settings():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    return {"notifications": _get_notification_settings()}, 200


@settings_bp.route("/api/settings/notifications", methods=["PUT"])
def update_notification_settings():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data = request.get_json() or {}
    updates = data.get("notifications", data)

    if not isinstance(updates, dict):
        return {"error": "notifications must be an object"}, 400

    current = _get_notification_settings()

    for key in _DEFAULT_NOTIFICATION_SETTINGS:
        if key in updates:
            value = updates[key]
            if not isinstance(value, bool):
                return {"error": f"{key} must be a boolean"}, 400
            current[key] = value

    session["notification_settings"] = current
    session.modified = True

    return {
        "message": "Notification settings updated",
        "notifications": current,
    }, 200


@settings_bp.route("/api/settings/about", methods=["GET"])
def get_about_settings():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    return {
        "appName": "StudyBuddyAI",
        "version": "1.0.0",
        "aiModel": "Gemini 2.5 Flash",
        "techStack": "React + Flask",
        "contact": "support@studybuddyai.app",
    }, 200