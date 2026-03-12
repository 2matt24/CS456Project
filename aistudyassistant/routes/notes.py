#routes for notes
# march 3rd 2026 Amath Gaye
from flask import Blueprint, request, session

from aistudyassistant.extensions import db
from aistudyassistant.models.note import Note
from aistudyassistant.models.course import Course
from aistudyassistant.services.neightnclient import summarize_text

# blueprint for notes route
notes_bp = Blueprint("notes", __name__)


def _current_user_id():
    return session.get("user_id")


def _serialize_note(note: Note):
    return {
        "noteID": note.NoteID,
        "courseID": note.CourseID,
        "title": note.Title,
        "content": note.Content,
        "fileName": note.FileName,
        "fileType": note.FileType,
        "createdAt": note.CreatedAt.isoformat() if note.CreatedAt else None,
        "updatedAt": note.UpdatedAt.isoformat() if note.UpdatedAt else None,
    }


@notes_bp.route("/api/notes", methods=["GET"])
def get_notes():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    course_id = request.args.get("courseId", type=int)

    query = (
    db.session.query(Note)
    .join(Course, Note.CourseID == Course.CourseID)
    .filter(Course.UserID == user_id)
)

    if course_id is not None:
        query = query.filter(Note.CourseID == course_id)

    notes = query.order_by(Note.CreatedAt.desc()).all()
    return {"notes": [_serialize_note(note) for note in notes]}, 200



@notes_bp.route("/api/notes", methods=["POST"])
def create_note():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    course_id = data.get("courseId")

    if not title:
        return {"error": "title is required"}, 400

    if not content:
        return {"error": "content is required"}, 400

    if not course_id:
        return {"error": "courseId is required"}, 400

    # SECURITY: verify course belongs to user
    course = Course.query.filter_by(
        CourseID=course_id,
        UserID=user_id
    ).first()

    if not course:
        return {"error": "Invalid course"}, 403

    note = Note(
        CourseID=course_id,
        Title=title,
        Content=content
    )

    db.session.add(note)
    db.session.commit()

    return {"message": "Note created", "note": _serialize_note(note)}, 201


@notes_bp.route("/api/notes/<int:note_id>", methods=["PUT"])
def update_note(note_id):
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    note = (
    db.session.query(Note)
    .join(Course, Note.CourseID == Course.CourseID)
    .filter(Note.NoteID == note_id, Course.UserID == user_id)
    .first()
)
    if not note:
        return {"error": "Note not found"}, 404

    data = request.get_json() or {}

    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return {"error": "title cannot be empty"}, 400
        note.Title = title

    if "content" in data:
        content = (data.get("content") or "").strip()
        if not content:
            return {"error": "content cannot be empty"}, 400
        note.Content = content

    if "courseId" in data:
        note.CourseID = data.get("courseId")

    db.session.commit()

    return {"message": "Note updated", "note": _serialize_note(note)}, 200


@notes_bp.route("/api/notes/summarize", methods=["POST"])
def summarize_note_content():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    max_sentences = data.get("maxSentences", 3)

    if not content:
        return {"error": "content is required"}, 400

    try:
        max_sentences = int(max_sentences)
    except (TypeError, ValueError):
        return {"error": "maxSentences must be an integer"}, 400

    max_sentences = min(max(max_sentences, 1), 10)

    try:
        summary = summarize_text(content, max_sentences=max_sentences)
    except Exception as e:
        print("AI summarization failed:", e)
        return {"error": "AI summarization service unavailable"}, 503

    return {"summary": summary}, 200



