from flask import Blueprint, request, session

from aistudyassistant.extensions import db
from aistudyassistant.models.chat_history import ChatHistory

chat_bp = Blueprint("chat", __name__)


def _current_user_id():
    return session.get("user_id")


# ── POST /api/chat ────────────────────────────────────────────────────────────
# Saves each exchange to ChatHistory.  The actual AI call happens client-side
# via Gemini; this endpoint is called *after* the frontend gets the response so
# the conversation is persisted without blocking the UI.
@chat_bp.route("/api/chat", methods=["POST"])
def chat_message():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data     = request.get_json() or {}
    message  = (data.get("message") or "").strip()
    response = (data.get("response") or "").strip()
    note_id  = data.get("noteId")  # optional int

    if not message:
        return {"error": "message is required"}, 400

    # Persist the exchange (response may be empty if the client is just logging
    # the user turn before the AI replies — that's fine, store what we have)
    try:
        entry = ChatHistory(
            UserID=user_id,
            NoteID=note_id if note_id else None,
            Message=message,
            Response=response or "",
        )
        db.session.add(entry)
        db.session.commit()
        return {"message": "Saved", "chatID": entry.ChatID}, 201
    except Exception as exc:
        db.session.rollback()
        print(f"[chat] DB error: {exc}")
        return {"error": "Failed to save chat"}, 500


# ── GET /api/chat/history ─────────────────────────────────────────────────────
@chat_bp.route("/api/chat/history", methods=["GET"])
def get_chat_history():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    limit   = request.args.get("limit", 50, type=int)
    note_id = request.args.get("noteId", type=int)

    query = ChatHistory.query.filter_by(UserID=user_id)
    if note_id:
        query = query.filter_by(NoteID=note_id)

    rows = (
        query.order_by(ChatHistory.CreatedAt.desc())
        .limit(limit)
        .all()
    )

    return {
        "history": [
            {
                "chatID":    h.ChatID,
                "message":   h.Message,
                "response":  h.Response,
                "noteID":    h.NoteID,
                "createdAt": h.CreatedAt.isoformat(),
            }
            for h in rows
        ]
    }, 200


# ── DELETE /api/chat/history ──────────────────────────────────────────────────
@chat_bp.route("/api/chat/history", methods=["DELETE"])
def clear_chat_history():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    try:
        ChatHistory.query.filter_by(UserID=user_id).delete()
        db.session.commit()
        return {"message": "History cleared"}, 200
    except Exception as exc:
        db.session.rollback()
        print(f"[chat] clear error: {exc}")
        return {"error": "Failed to clear history"}, 500
