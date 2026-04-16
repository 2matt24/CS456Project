#from flask import Blueprint, request, session
from flask import Blueprint, request

from aistudyassistant.extensions import db
from aistudyassistant.models.notification import Notification
from aistudyassistant.services.auth_tokens import get_authenticated_user_id


notifications_bp = Blueprint("notifications", __name__)


def _current_user_id():
    #return session.get("user_id")
    return get_authenticated_user_id()


def _serialize(n: Notification):
    return {
        "notificationID": n.NotificationID,
        "title":          n.Title,
        "message":        n.Message,
        "isRead":         n.IsRead,
        "type":           n.Type,
        "createdAt":      n.CreatedAt.isoformat(),
    }

def create_notification_for_user(user_id, title, message, ntype="system"):
    """Create and persist a notification for a specific user."""
    clean_title = (title or "").strip()
    clean_message = (message or "").strip()
    clean_type = (ntype or "system").strip()

    if not user_id or not clean_title or not clean_message:
        return None

    notif = Notification(
        UserID=user_id,
        Title=clean_title,
        Message=clean_message,
        Type=clean_type,
    )
    db.session.add(notif)
    return notif


# ── GET /api/notifications ────────────────────────────────────────────────────
@notifications_bp.route("/api/notifications", methods=["GET"])
def get_notifications():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    rows = (
        Notification.query
        .filter_by(UserID=user_id)
        .order_by(Notification.CreatedAt.desc())
        .limit(50)
        .all()
    )

    unread = sum(1 for n in rows if not n.IsRead)

    return {"notifications": [_serialize(n) for n in rows], "unreadCount": unread}, 200


# ── GET /api/notifications/unread-count ───────────────────────────────────────
@notifications_bp.route("/api/notifications/unread-count", methods=["GET"])
def unread_count():
    user_id = _current_user_id()
    if not user_id:
        return {"unreadCount": 0}, 200

    count = Notification.query.filter_by(UserID=user_id, IsRead=False).count()
    return {"unreadCount": count}, 200


# ── PUT /api/notifications/<id>/read ─────────────────────────────────────────
@notifications_bp.route("/api/notifications/<int:notification_id>/read", methods=["PUT"])
def mark_read(notification_id):
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    notif = Notification.query.filter_by(
        NotificationID=notification_id, UserID=user_id
    ).first()

    if not notif:
        return {"error": "Notification not found"}, 404

    notif.IsRead = True
    db.session.commit()
    return {"message": "Marked as read"}, 200


# ── PUT /api/notifications/read-all ──────────────────────────────────────────
@notifications_bp.route("/api/notifications/read-all", methods=["PUT"])
def mark_all_read():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    Notification.query.filter_by(UserID=user_id, IsRead=False).update({"IsRead": True})
    db.session.commit()
    return {"message": "All marked as read"}, 200


# ── POST /api/notifications ───────────────────────────────────────────────────
# Internal helper — lets other routes (study sessions, etc.) create notifications
@notifications_bp.route("/api/notifications", methods=["POST"])
def create_notification():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data    = request.get_json() or {}
    title   = (data.get("title") or "").strip()
    message = (data.get("message") or "").strip()
    ntype   = (data.get("type") or "system").strip()

    if not title or not message:
        return {"error": "title and message are required"}, 400

    
    notif = create_notification_for_user(user_id, title, message, ntype)
    if notif is None:
        return {"error": "title and message are required"}, 400
    db.session.commit()
    return {"message": "Created", "notification": _serialize(notif)}, 201


