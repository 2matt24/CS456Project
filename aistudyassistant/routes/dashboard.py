import os
import random
from datetime import datetime

from google import genai
from flask import Blueprint
from aistudyassistant.services.auth_tokens import get_authenticated_user_id

dashboard_bp = Blueprint("dashboard", __name__)

_GEMINI_KEY    = os.getenv("GEMINI_API_KEY")
_gemini_client = genai.Client(api_key=_GEMINI_KEY) if _GEMINI_KEY else None

_FALLBACK_QUOTES = [
    "Every expert was once a beginner.",
    "Consistency beats perfection every time.",
    "Small steps every day lead to big results.",
    "Knowledge is the best investment you can make.",
    "Your future self will thank you for studying today.",
    "One note at a time, one concept at a time.",
    "Every sunrise brings new opportunities to learn and grow.",
    "Starting is the hardest part. You're already winning.",
]


@dashboard_bp.route("/api/dashboard/quote", methods=["GET"])
def get_motivational_quote():
    """Generate a personalized, context-aware motivational quote via Gemini."""
    #user_id = session.get("user_id")
    user_id = get_authenticated_user_id()

    # Gather lightweight user-activity context
    session_count = 0
    note_count = 0
    if user_id:
        try:
            from aistudyassistant.models.study_session import StudySession
            from aistudyassistant.models.note import Note
            session_count = StudySession.query.filter_by(UserID=user_id).count()
            note_count    = Note.query.filter_by(UserID=user_id).count()
        except Exception:
            pass

    # Time-of-day context
    hour = datetime.now().hour
    if hour < 12:
        time_context = "morning"
    elif hour < 17:
        time_context = "afternoon"
    else:
        time_context = "evening"

    day        = datetime.now().strftime("%A")
    is_weekend = day in ("Saturday", "Sunday")

    if session_count > 5:
        activity_context = "The student has been studying very consistently."
    elif session_count > 0:
        activity_context = "The student is building study momentum."
    else:
        activity_context = "The student is ready to begin their learning journey."

    if not _gemini_client:
        return {"quote": random.choice(_FALLBACK_QUOTES)}, 200

    try:
        prompt = f"""Generate ONE short, inspiring quote for a student.

Context:
- Time of day: {time_context}
- Day: {day} {"(weekend)" if is_weekend else "(weekday)"}
- {activity_context}
- Notes created: {note_count}

Requirements:
- Maximum 15 words
- Focus on learning, growth, consistency, or achievement
- Positive and motivating tone
- NO attribution (no "— Author Name")
- Return ONLY the quote text, nothing else

Examples of good output:
Small daily improvements over time lead to stunning results.
Every expert was once a beginner who refused to give up.
Morning minds are sharp minds — make today count."""

        response = _gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        quote = response.text.strip().strip('"').strip("'").strip("—").strip()

        if not quote or len(quote) > 200:
            raise ValueError("Bad quote response")

        return {"quote": quote}, 200

    except Exception as e:
        print(f"Quote generation error: {e}")
        return {"quote": random.choice(_FALLBACK_QUOTES)}, 200
