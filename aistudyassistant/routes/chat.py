import os

import google.generativeai as genai
from flask import Blueprint, request, session

from aistudyassistant.extensions import db
from aistudyassistant.models.chat_history import ChatHistory

chat_bp = Blueprint("chat", __name__)

# Configure Gemini once at import time.  Key lives only in the server env.
_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
if _GEMINI_KEY:
    genai.configure(api_key=_GEMINI_KEY)

_MODEL_NAME = "gemini-2.5-flash"

# System prompt shared by all chat surfaces
_BASE_SYSTEM = (
    "You are a helpful AI Study Assistant for a student productivity app. "
    "Help students understand concepts, quiz them on their notes, suggest study "
    "strategies, and answer academic questions. Be concise and encouraging. "
    "Use bullet points or numbered lists when that makes the answer clearer. "
    "Keep responses under 300 words unless the student explicitly asks for more detail."
)


def _current_user_id():
    return session.get("user_id")


def _build_system_prompt(note_context, file_context):
    """Append optional note / file context to the base system prompt."""
    parts = [_BASE_SYSTEM]
    if note_context and note_context.get("title") and note_context.get("content"):
        parts.append(
            f'\n\nThe student is currently discussing a note titled '
            f'"{note_context["title"]}". '
            f'Note content:\n\n{note_context["content"]}'
        )
    if file_context:
        parts.append(f"\n\nThe student has shared the following file content:\n\n{file_context}")
    return "".join(parts)


def _build_gemini_history(history):
    """
    Convert the frontend message list to the format expected by the
    google-generativeai SDK: list of Content dicts with role + parts.
    The welcome message (id == 'welcome') is skipped.
    """
    result = []
    for msg in history:
        if msg.get("id") == "welcome":
            continue
        role = "user" if msg.get("role") == "user" else "model"
        text = (msg.get("text") or "").strip()
        if text:
            result.append({"role": role, "parts": [{"text": text}]})
    return result


# ── POST /api/chat ────────────────────────────────────────────────────────────
# Accepts:
#   message      (str, required)  — the user's latest message
#   history      (list, optional) — previous turns [{role, text, id}, ...]
#   noteContext  (obj, optional)  — {title, content}
#   fileContext  (str, optional)  — raw text from an uploaded file
#   noteId       (int, optional)  — FK for persistence
@chat_bp.route("/api/chat", methods=["POST"])
def chat_message():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data         = request.get_json() or {}
    message      = (data.get("message") or "").strip()
    history      = data.get("history") or []
    note_context = data.get("noteContext")   # {title, content} or None
    file_context = data.get("fileContext")   # str or None
    note_id      = data.get("noteId")        # int or None

    if not message:
        return {"error": "message is required"}, 400

    # ── Call Gemini ──────────────────────────────────────────────────────────
    ai_response = ""
    if not _GEMINI_KEY:
        ai_response = (
            "AI is not configured on this server. "
            "Please ask the administrator to set GEMINI_API_KEY."
        )
    else:
        try:
            system_prompt = _build_system_prompt(note_context, file_context)
            gemini_history = _build_gemini_history(history)

            model = genai.GenerativeModel(
                model_name=_MODEL_NAME,
                system_instruction=system_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=600,
                ),
            )

            chat_session = model.start_chat(history=gemini_history)
            result = chat_session.send_message(message)
            ai_response = result.text or ""
        except Exception as exc:
            print(f"[chat] Gemini error: {exc}")
            return {"error": "AI service unavailable. Please try again shortly."}, 503

    # ── Persist the exchange ─────────────────────────────────────────────────
    try:
        entry = ChatHistory(
            UserID=user_id,
            NoteID=int(note_id) if note_id else None,
            Message=message,
            Response=ai_response,
        )
        db.session.add(entry)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        print(f"[chat] DB persist error: {exc}")
        # Non-fatal — still return the AI response even if DB write fails

    return {"response": ai_response}, 200


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
