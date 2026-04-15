# Feb 10th 2026, Amath Gaye.
#authentication
# references: https://flask.palletsprojects.com/en/latest/tutorial/views/ . https://www.geeksforgeeks.org/python/flask-tutorial/
# refereces: https://werkzeug.palletsprojects.com/en/latest/utils/#module-werkzeug.security  https://www.geeksforgeeks.org/python/flask-blueprints/

#references: https://www.geeksforgeeks.org/python/how-to-hash-passwords-in-python/   || https://www.geeksforgeeks.org/python/sqlalchemy-tutorial/
#referecing http status codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
#reference: jwt structure: https://www.geeksforgeeks.org/web-tech/json-web-token-jwt/
import io
import os
import uuid
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, session
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from aistudyassistant.models.user import User
from aistudyassistant.extensions import db



# blueprint instance(groups and organizes routes in modules)
auth_bp = Blueprint("auth", __name__)



#registering route

@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

    print("Incoming data:", data)


    if not data:
        return {"error": "No data provided"}, 400

    email = data.get("email")
    password = data.get("password")
    first_name = data.get("firstName")
    last_name = data.get("lastName")

    if not email or not password:
        return{"error":"Email and password required to register"}, 400

    # Checking if an user already exists
    existing_user = User.query.filter_by(Email=email).first() #sql query filtering email
    if existing_user:
        return {"error": "User already exists"}, 400

    #hashing the password
    hashedPassword = generate_password_hash(password)

    #matching
    newUser = User(
        Email=email,
        PasswordHash=hashedPassword,
        FirstName=first_name,
        LastName=last_name,
        CreatedAt=datetime.utcnow(),
    )

    db.session.add(newUser)
    db.session.commit()

    return {"message": "User has been registered successfully"}, 201


#login route
@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return {"error": "No data was provided"}, 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return {"error": "Email and password required to login"}, 400

#checking user email
    user = User.query.filter_by(Email=email).first()

    if not user:
        return {"error": "Invalid credentials"}, 401

    # checking hash
    if not check_password_hash(user.PasswordHash, password):
        return {"error": "Invalid credentials"}, 401

    # storing the user id
    session["user_id"] = user.UserID

    return {
        "message": "Login successful",
        "user": {
            "email": user.Email,
            "firstName": user.FirstName,
            "lastName": user.LastName,
        }
    }, 200


#--------- LOGOUT -----
@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return {"message": "Logged out successfully"}, 200


#--------- CURRENT USER -----
@auth_bp.route("/api/user/me", methods=["GET"])
def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "Not authenticated"}, 401

    user = User.query.get(user_id)
    if not user:
        return {"error": "User not found"}, 404

    return {
        "user": {
            "id":                    user.UserID,
            "email":                 user.Email,
            "firstName":             user.FirstName,
            "lastName":              user.LastName,
            "phone":                 user.Phone,
            "bio":                   user.Bio,
            "profilePicture":        user.ProfilePicture,
            "createdAt":             user.CreatedAt.isoformat() if user.CreatedAt else None,
            "onboardingCompleted":   bool(user.OnboardingCompleted),
            "schoolName":            user.SchoolName,
            "gradeLevel":            user.GradeLevel,
            "major":                 user.Major,
            "occupation":            user.Occupation,
            "studyGoalHoursPerWeek": user.StudyGoalHoursPerWeek,
            "preferredStudyTime":    user.PreferredStudyTime,
            "accentColor":           user.AccentColor or "#667eea",
        }
    }, 200


#--------- UPDATE PROFILE -----
@auth_bp.route("/api/user/me", methods=["PUT"])
def update_user():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "Not authenticated"}, 401

    user = User.query.get(user_id)
    if not user:
        return {"error": "User not found"}, 404

    data = request.get_json() or {}

    if "firstName" in data:
        first = (data["firstName"] or "").strip()
        if not first:
            return {"error": "First name cannot be empty"}, 400
        user.FirstName = first

    if "lastName" in data:
        last = (data["lastName"] or "").strip()
        if not last:
            return {"error": "Last name cannot be empty"}, 400
        user.LastName = last

    if "email" in data:
        new_email = (data["email"] or "").strip().lower()
        if not new_email:
            return {"error": "Email cannot be empty"}, 400
        # Check uniqueness only if email actually changed
        if new_email != user.Email.lower():
            existing = User.query.filter_by(Email=new_email).first()
            if existing:
                return {"error": "Email already in use"}, 409
        user.Email = new_email

    if "phone" in data:
        user.Phone = (data["phone"] or "").strip() or None

    if "bio" in data:
        user.Bio = (data["bio"] or "").strip() or None

    db.session.commit()

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user.UserID,
            "email": user.Email,
            "firstName": user.FirstName,
            "lastName": user.LastName,
            "phone": user.Phone,
            "bio": user.Bio
        }
    }, 200


#--------- CHANGE PASSWORD -----
@auth_bp.route("/api/user/me/password", methods=["PUT"])
def change_password():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "Not authenticated"}, 401

    user = User.query.get(user_id)
    if not user:
        return {"error": "User not found"}, 404

    data = request.get_json() or {}
    current_password = data.get("currentPassword", "")
    new_password = data.get("newPassword", "")

    if not current_password or not new_password:
        return {"error": "Current and new password are required"}, 400

    if not check_password_hash(user.PasswordHash, current_password):
        return {"error": "Current password is incorrect"}, 401

    if len(new_password) < 6:
        return {"error": "New password must be at least 6 characters"}, 400

    user.PasswordHash = generate_password_hash(new_password)
    db.session.commit()

    return {"message": "Password changed successfully"}, 200


#--------- UPLOAD PROFILE PICTURE -----
@auth_bp.route("/api/user/me/profile-picture", methods=["POST"])
def upload_profile_picture():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "Not authenticated"}, 401

    file = request.files.get("profilePicture")
    if not file or not file.filename:
        return {"error": "No file provided"}, 400

    # Validate MIME type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.mimetype not in allowed_types:
        return {"error": "Only JPG, PNG, GIF, and WEBP images are allowed"}, 415

    # Read bytes and validate size (5 MB limit)
    file_bytes = file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        return {"error": "Image must be smaller than 5 MB"}, 413

    # Upload to Azure Blob Storage
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_str:
        return {"error": "Storage service not configured"}, 503

    try:
        from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
        safe_name   = secure_filename(file.filename)
        ext         = safe_name.rsplit('.', 1)[-1].lower() if '.' in safe_name else 'jpg'
        blob_name   = f"profiles/{user_id}/{uuid.uuid4()}.{ext}"
        container   = "notes-files"

        blob_svc    = BlobServiceClient.from_connection_string(conn_str)
        blob_client = blob_svc.get_blob_client(container=container, blob=blob_name)
        blob_client.upload_blob(io.BytesIO(file_bytes), overwrite=True)

        # Generate a SAS token (5-year expiry) so the image URL is publicly accessible
        conn_parts   = dict(chunk.split("=", 1) for chunk in conn_str.split(";") if "=" in chunk)
        sas_token    = generate_blob_sas(
            account_name=conn_parts.get("AccountName", ""),
            container_name=container,
            blob_name=blob_name,
            account_key=conn_parts.get("AccountKey", ""),
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(days=365 * 5),
        )
        file_url = f"{blob_client.url}?{sas_token}"
    except Exception as exc:
        print(f"[profile-picture] Azure upload error: {exc}", flush=True)
        return {"error": f"Upload error: {exc}"}, 500

    # Persist URL on the User record
    user = User.query.get(user_id)
    if not user:
        return {"error": "User not found"}, 404

    user.ProfilePicture = file_url
    db.session.commit()

    return {"profilePictureUrl": file_url}, 200


#--------- ONBOARDING STATUS -----
@auth_bp.route("/api/user/onboarding/status", methods=["GET"])
def get_onboarding_status():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "Not authenticated"}, 401

    user = User.query.get(user_id)
    if not user:
        return {"error": "User not found"}, 404

    return {
        "onboardingCompleted": bool(user.OnboardingCompleted),
        "firstName": user.FirstName,
    }, 200


#--------- COMPLETE ONBOARDING -----
@auth_bp.route("/api/user/onboarding", methods=["POST"])
def complete_onboarding():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "Not authenticated"}, 401

    user = User.query.get(user_id)
    if not user:
        return {"error": "User not found"}, 404

    data = request.get_json() or {}

    user.SchoolName            = data.get("schoolName")
    user.GradeLevel            = data.get("gradeLevel")
    user.Major                 = data.get("major")
    user.Occupation            = data.get("occupation")
    user.StudyGoalHoursPerWeek = data.get("studyGoalHoursPerWeek")
    user.PreferredStudyTime    = data.get("preferredStudyTime")
    user.AccentColor           = data.get("accentColor") or "#667eea"
    user.OnboardingCompleted   = True
    user.OnboardingCompletedAt = datetime.utcnow()

    db.session.commit()

    return {
        "message": "Onboarding completed successfully",
        "user": {
            "firstName":           user.FirstName,
            "onboardingCompleted": True,
        },
    }, 200
