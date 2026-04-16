import os
import random
from datetime import datetime

import google.generativeai as genai
#from flask import Blueprint, session
from aistudyassistant.services.auth_tokens import get_authenticated_user_id
from flask import Blueprint

dashboard_bp = Blueprint("dashboard", __name__)

_GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if _GEMINI_KEY:
    genai.configure(api_key=_GEMINI_KEY)

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

    if not _GEMINI_KEY:
        return {"quote": random.choice(_FALLBACK_QUOTES)}, 200

    try:
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
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

        response = model.generate_content(prompt)
        quote = response.text.strip().strip('"').strip("'").strip("—").strip()

        if not quote or len(quote) > 200:
            raise ValueError("Bad quote response")

        return {"quote": quote}, 200

    except Exception as e:
        print(f"Quote generation error: {e}")
        return {"quote": random.choice(_FALLBACK_QUOTES)}, 200
