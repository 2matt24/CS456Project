import os
import uuid

from google import genai
from google.genai import types as genai_types
from flask import Blueprint, request
from sqlalchemy import func, desc

from aistudyassistant.extensions import db
from aistudyassistant.models.chat_history import ChatHistory
from aistudyassistant.services.text_extractor import extract_text_from_file
from aistudyassistant.services.auth_tokens import get_authenticated_user_id

chat_bp = Blueprint("chat", __name__)

_GEMINI_KEY    = (os.getenv("GEMINI_API_KEY") or "").strip()
_gemini_client = genai.Client(api_key=_GEMINI_KEY) if _GEMINI_KEY else None

_MODEL_NAME = "gemini-2.5-flash"

_BASE_SYSTEM = (
    "You are a helpful AI Study Assistant for a student productivity app. "
    "Help students understand concepts, quiz them on their notes, suggest study "
    "strategies, and answer academic questions. Be concise and encouraging. "
    "Use bullet points or numbered lists when that makes the answer clearer. "
    "Keep responses under 300 words unless the student explicitly asks for more detail."
)


def _current_user_id():
    #return session.get("user_id")
    return get_authenticated_user_id()


#def _build_system_prompt(course_context=None):
def _build_system_prompt(course_context=None, note_context=None):
    parts = [_BASE_SYSTEM]
    if course_context and course_context.get("courseName"):
        parts.append(
            f'\n\nThe student is currently studying the course: '
            f'"{course_context["courseName"]}". '
            f'Tailor your explanations, examples, and quiz questions to this subject area.'
        )

    if note_context and (note_context.get("title") or note_context.get("content")):
        note_title = (note_context.get("title") or "Untitled note").strip()
        note_content = (note_context.get("content") or "").strip()
        if note_content:
            note_content = note_content[:12000]
            parts.append(
                f'\n\nThe student asked about this note: "{note_title}". '
                f"Treat this note content as the primary study source for this conversation:\n\n"
                f"{note_content}"
            )
        else:
            parts.append(
                f'\n\nThe student asked about this note: "{note_title}". '
                "Use this note title as context when answering."
            )
    return "".join(parts)


def _build_gemini_contents(history, new_message):
    """
    Convert the frontend message list + new message into the Contents list
    expected by the google-genai SDK.  The welcome message is skipped.
    """
    contents = []
    for msg in history:
        if msg.get("id") == "welcome":
            continue
        if msg.get("role") == "system":
            continue
        role = "user" if msg.get("role") == "user" else "model"
        text = (msg.get("text") or "").strip()
        if text:
            contents.append(
                genai_types.Content(
                    role=role,
                    parts=[genai_types.Part.from_text(text)],
                )
            )
    # Append the new user message
    contents.append(
        genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(new_message)],
        )
    )
    return contents


# ── POST /api/chat ────────────────────────────────────────────────────────────
@chat_bp.route("/api/chat", methods=["POST"])
def chat_message():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data               = request.get_json() or {}
    message            = (data.get("message") or "").strip()
    history            = data.get("history") or []
    course_context     = data.get("courseContext")
    note_context       = data.get("noteContext")
    note_id            = data.get("noteId")
    try:
        note_id = int(note_id) if note_id is not None else None
    except (TypeError, ValueError):
        note_id = None
    session_id         = data.get("sessionId") or str(uuid.uuid4())
    conversation_title = data.get("conversationTitle") or ""

    if not message:
        return {"error": "message is required"}, 400

    # Use existing session title if available, otherwise generate from first message
    if not conversation_title:
        try:
            existing = db.session.query(ChatHistory.ConversationTitle).filter(
                ChatHistory.UserID == user_id,
                ChatHistory.SessionID == session_id,
                ChatHistory.ConversationTitle.isnot(None),
            ).first()
            if existing and existing[0]:
                conversation_title = existing[0]
            else:
                conversation_title = message[:60] + ("…" if len(message) > 60 else "")
        except Exception:
            # ConversationTitle / SessionID columns may not exist in DB yet
            conversation_title = message[:60] + ("…" if len(message) > 60 else "")

    ai_response = ""
    if not _gemini_client:
        ai_response = "AI is not configured on this server. Please set GEMINI_API_KEY."
    else:
        try:
            system_prompt = _build_system_prompt(course_context, note_context)
            contents      = _build_gemini_contents(history, message)

            result = _gemini_client.models.generate_content(
                model=_MODEL_NAME,
                contents=contents,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.7,
                    max_output_tokens=600,
                ),
            )
            ai_response = result.text or ""
        except Exception as exc:
            print(f"[chat] Gemini error: {exc}")
            return {"error": "AI service unavailable. Please try again shortly."}, 503

    try:
        entry = ChatHistory(
            UserID=user_id,
            Message=message,
            Response=ai_response,
            NoteID=note_id,
            SessionID=session_id,
            ConversationTitle=conversation_title,
        )
        db.session.add(entry)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        print(f"[chat] DB persist error: {exc}")

    return {"response": ai_response, "sessionId": session_id}, 200


# ── POST /api/chat/extract-file ───────────────────────────────────────────────
@chat_bp.route("/api/chat/extract-file", methods=["POST"])
def extract_file_for_chat():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    file = request.files.get("file")
    if not file or not file.filename:
        return {"error": "No file provided"}, 400

    filename = file.filename
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    try:
        text = extract_text_from_file(file, ext)
        if not text or not text.strip():
            return {"error": "Could not extract text from file"}, 422
        return {"text": text[:8000], "fileName": filename}, 200
    except Exception as exc:
        print(f"[chat/extract-file] error: {exc}")
        return {"error": str(exc)}, 500


# ── GET /api/chat/conversations ───────────────────────────────────────────────
@chat_bp.route("/api/chat/conversations", methods=["GET"])
def get_conversations():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    try:
        rows = (
            db.session.query(
                ChatHistory.SessionID,
                func.min(ChatHistory.ConversationTitle).label("title"),
                func.max(ChatHistory.CreatedAt).label("last_at"),
                func.count(ChatHistory.ChatID).label("msg_count"),
            )
            .filter(
                ChatHistory.UserID == user_id,
                ChatHistory.SessionID.isnot(None),
            )
            .group_by(ChatHistory.SessionID)
            .order_by(desc("last_at"))
            .limit(50)
            .all()
        )
    except Exception as exc:
        print(f"[chat/conversations] query error: {exc}")
        return {"conversations": []}, 200  # graceful fallback if columns don't exist yet

    result = []
    for r in rows:
        result.append({
            "sessionId":     r.SessionID,
            "title":         r.title or "Untitled Chat",
            "lastMessageAt": r.last_at.isoformat() if r.last_at else None,
            "messageCount":  r.msg_count,
        })

    return {"conversations": result}, 200


# ── GET /api/chat/conversations/<session_id> ──────────────────────────────────
@chat_bp.route("/api/chat/conversations/<session_id>", methods=["GET"])
def get_conversation(session_id):
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    rows = (
        ChatHistory.query
        .filter_by(UserID=user_id, SessionID=session_id)
        .order_by(ChatHistory.CreatedAt.asc())
        .all()
    )

    messages = []
    for h in rows:
        messages.append({"role": "user", "text": h.Message,  "timestamp": h.CreatedAt.isoformat()})
        messages.append({"role": "ai",   "text": h.Response, "timestamp": h.CreatedAt.isoformat()})

    return {"messages": messages, "sessionId": session_id}, 200


# ── DELETE /api/chat/conversations/<session_id> ───────────────────────────────
@chat_bp.route("/api/chat/conversations/<session_id>", methods=["DELETE"])
def delete_conversation(session_id):
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    try:
        ChatHistory.query.filter_by(UserID=user_id, SessionID=session_id).delete()
        db.session.commit()
        return {"message": "Conversation deleted"}, 200
    except Exception as exc:
        db.session.rollback()
        return {"error": str(exc)}, 500


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

    rows = query.order_by(ChatHistory.CreatedAt.desc()).limit(limit).all()

    return {
        "history": [
            {
                "chatID":    h.ChatID,
                "message":   h.Message,
                "response":  h.Response,
                "noteID":    h.NoteID,
                "sessionId": h.SessionID,
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
