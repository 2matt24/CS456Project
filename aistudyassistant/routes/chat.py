from flask import Blueprint, request, session

chat_bp = Blueprint("chat", __name__)


def _current_user_id():
    return session.get("user_id")


@chat_bp.route("/api/chat", methods=["POST"])
def chat_message():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data = request.get_json() or {}
    message = (data.get("message") or "").strip()

    if not message:
        return {"error": "Message required"}, 400

    # Placeholder response — swap this block for your AI service (OpenAI, n8n, etc.)
    ai_response = (
        f"I received your message: \"{message}\". "
        "The full AI integration is coming soon — this will connect to our study AI service!"
    )

    return {"response": ai_response}, 200
