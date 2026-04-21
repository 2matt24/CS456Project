#routes for notes
# march 3rd 2026 Amath Gaye
import json
import os
import re

import google.generativeai as genai
#from flask import Blueprint, request, session
from flask import Blueprint, request

_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
if _GEMINI_KEY:
    genai.configure(api_key=_GEMINI_KEY)

from aistudyassistant.extensions import db
from aistudyassistant.models.note import Note
from aistudyassistant.models.course import Course
from aistudyassistant.services.neightnclient import summarize_text
from aistudyassistant.services.azure_storage import AzureStorageService
from aistudyassistant.services.pinecone_service import PineconeService
from aistudyassistant.services.text_extractor import extract_text_from_file
from aistudyassistant.services.auth_tokens import get_authenticated_user_id

# blueprint for notes route
notes_bp = Blueprint("notes", __name__)
#storage_service = AzureStorageService()
#pinecone_service = PineconeService()


def get_storage_service():
    return AzureStorageService()

def get_pinecone_service():
    return PineconeService()



def _current_user_id():
    #return session.get("user_id")
    return get_authenticated_user_id()


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

# Route for uploading note files (PDF, TXT, etc.)
@notes_bp.route("/api/notes/upload", methods=["POST"])
def upload_note_file():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401
    
    # Check if file is present
    if 'file' not in request.files:
        return {"error": "No file provided"}, 400
    
    file = request.files['file']
    course_id = request.form.get('courseId')
    title = request.form.get('title', file.filename)
    
    if not course_id:
        return {"error": "courseId is required"}, 400
    
    # Verify course ownership
    course = Course.query.filter_by(CourseID=course_id, UserID=user_id).first()
    if not course:
        return {"error": "Invalid course"}, 403
    
    try:
        original_filename = file.filename or "upload"
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'txt'

        # ── 1. Try Azure upload (optional – skip gracefully if not configured) ──
        file_url = None
        try:
            upload_result = get_storage_service().upload_file(file, user_id, course_id)
            file_url = upload_result.get('url')
            # Reset pointer after Azure consumed the stream
            file.seek(0)
        except Exception as azure_err:
            print(f"Azure upload skipped (will save note without cloud storage): {azure_err}")
            file.seek(0)

        # ── 2. Extract text ──────────────────────────────────────────────────────
        extracted_text = extract_text_from_file(file, file_extension)
        if not extracted_text:
            extracted_text = f"File uploaded: {original_filename}"

        # ── 3. Save note to database ─────────────────────────────────────────────
        note = Note(
            CourseID=course_id,
            Title=title,
            Content=extracted_text,
            FileName=original_filename,
            FileType=file_extension
        )
        db.session.add(note)
        db.session.commit()

        # ── 4. Add to Pinecone (optional – skip gracefully if not configured) ───
        try:
            get_pinecone_service().add_note(
                note_id=note.NoteID,
                content=extracted_text,
                metadata={
                    "user_id": str(user_id),
                    "course_id": str(course_id),
                    "title": title,
                    "filename": original_filename
                }
            )
        except Exception as pinecone_err:
            print(f"Pinecone indexing skipped: {pinecone_err}")

        return {
            "message": "File uploaded successfully",
            "note": _serialize_note(note),
            "fileUrl": file_url
        }, 201

    except Exception as e:
        print(f"Upload error: {e}")
        return {"error": str(e)}, 500


@notes_bp.route("/api/notes/search", methods=["POST"])
def search_notes():
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401
    
    data = request.get_json() or {}
    query = data.get("query", "").strip()
    
    if not query:
        return {"error": "query is required"}, 400
    
    try:
        # Search Pinecone
        #results = pinecone_service.search_notes(query, user_id, top_k=5)
        results = get_pinecone_service().search_notes(query, user_id, top_k=5)
        
        # Format results
        formatted_results = [{
            "noteId": match.id,
            "score": match.score,
            "title": match.metadata.get("title", "Untitled"),
            "courseId": match.metadata.get("course_id")
        } for match in results]
        
        return {"results": formatted_results}, 200
    except Exception as e:
        print(f"Search error: {e}")
        return {"error": "Search failed"}, 500

# 
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

    # Add to Pinecone for semantic search (optional – skip if not configured)
    try:
        get_pinecone_service().add_note(
            note_id=note.NoteID,
            content=content,
            metadata={
                "user_id": str(user_id),
                "course_id": str(course_id),
                "title": title
            }
        )
    except Exception as e:
        print(f"Warning: Failed to add note to Pinecone: {e}")

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


@notes_bp.route("/api/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
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

    db.session.delete(note)
    db.session.commit()
    return {"message": "Note deleted"}, 200


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


@notes_bp.route("/api/notes/generate-quiz", methods=["POST"])
def generate_quiz():
    """Generate practice multiple-choice questions from note content using Gemini."""
    user_id = _current_user_id()
    if not user_id:
        return {"error": "Authentication required"}, 401

    if not _GEMINI_KEY:
        return {"error": "AI service not configured"}, 503

    data           = request.get_json() or {}
    content        = (data.get("content") or "").strip()
    question_count = max(1, min(int(data.get("questionCount", 5)), 10))
    difficulty     = data.get("difficulty", "medium")

    if not content:
        return {"error": "content is required"}, 400

    # Truncate to avoid token overflow (~4 000 chars ≈ 1 000 tokens)
    content_preview = content[:4000]

    prompt = f"""You are an expert educator creating practice quiz questions.

Generate {question_count} multiple-choice questions based on this study material:

{content_preview}

Requirements:
- Difficulty level: {difficulty}
- Each question must have exactly 4 answer options (A, B, C, D)
- Only ONE correct answer per question
- Include a brief explanation for why the answer is correct
- Focus on key concepts, definitions, and important details

Return ONLY a JSON array with this EXACT structure (no markdown, no explanation outside the JSON):
[
  {{
    "question": "Question text here",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswer": "A",
    "explanation": "Why A is correct"
  }}
]"""

    try:
        model    = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        raw      = response.text.strip()

        # Strip markdown fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        questions = json.loads(raw)

        if not isinstance(questions, list):
            raise ValueError("Response is not a JSON array")

        required = {"question", "options", "correctAnswer", "explanation"}
        for q in questions:
            if not required.issubset(q):
                raise ValueError(f"Missing keys in question: {q}")
            if len(q["options"]) != 4:
                raise ValueError("Each question must have exactly 4 options")

        return {"questions": questions, "count": len(questions)}, 200

    except json.JSONDecodeError as exc:
        print(f"[quiz] JSON parse error: {exc}\nRaw: {raw[:300]}")
        return {"error": "Failed to parse quiz from AI response. Please try again."}, 500
    except Exception as exc:
        print(f"[quiz] Generation error: {exc}")
        return {"error": f"Quiz generation failed: {str(exc)}"}, 500