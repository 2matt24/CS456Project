# Feb 10th 2026, Amath Gaye.
from datetime import datetime, timezone

from flask import Blueprint, request, session
from werkzeug.security import generate_password_hash, check_password_hash

from aistudyassistant.extensions import db
from aistudyassistant.models.user import User
from aistudyassistant.services.auth_tokens import issue_auth_token, get_authenticated_user_id

auth_bp = Blueprint("auth", __name__)


def _serialize_user(user: User):
    return {
        "userID": user.UserID,
        "email": user.Email,
        "firstName": user.FirstName,
        "lastName": user.LastName,
    }


def _build_auth_response(user: User, message: str, status_code: int = 200):
    session["user_id"] = user.UserID
    user.LastLogin = datetime.now(timezone.utc)
    db.session.commit()
    return {
        "message": message,
        "token": issue_auth_token(user.UserID),
        "user": _serialize_user(user),
    }, status_code


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return {"error": "No data provided"}, 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    first_name = (data.get("firstName") or "").strip() or None
    last_name = (data.get("lastName") or "").strip() or None

    if not email or not password:
        return {"error": "Email and password required to register"}, 400

    existing_user = User.query.filter_by(Email=email).first()
    if existing_user:
        return {"error": "User already exists"}, 400

    new_user = User(
        Email=email,
        PasswordHash=generate_password_hash(password),
        FirstName=first_name,
        LastName=last_name,
        CreatedAt=datetime.now(timezone.utc),
        LastLogin=datetime.now(timezone.utc),
    )

    db.session.add(new_user)
    db.session.commit()

    return _build_auth_response(new_user, "User has been registered successfully", 201)


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return {"error": "No data was provided"}, 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return {"error": "Email and password required to login"}, 400

    user = User.query.filter_by(Email=email).first()
    if not user or not check_password_hash(user.PasswordHash, password):
        return {"error": "Invalid credentials"}, 401

    return _build_auth_response(user, "Login successful")


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return {"message": "Logged out successfully"}, 200


@auth_bp.route("/api/session", methods=["GET"])
def get_session_state():
    user_id = get_authenticated_user_id()
    if not user_id:
        return {"authenticated": False}, 200

    user = User.query.get(user_id)
    if not user:
        session.clear()
        return {"authenticated": False}, 200

    return {
        "authenticated": True,
        "token": issue_auth_token(user.UserID),
        "user": _serialize_user(user),
    }, 200
