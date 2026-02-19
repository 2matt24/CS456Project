
# Feb 10th 2026, Amath Gaye. 
#authentication 
# references: https://flask.palletsprojects.com/en/latest/tutorial/views/ . https://www.geeksforgeeks.org/python/flask-tutorial/
# refereces: https://werkzeug.palletsprojects.com/en/latest/utils/#module-werkzeug.security  https://www.geeksforgeeks.org/python/flask-blueprints/

#references: https://www.geeksforgeeks.org/python/how-to-hash-passwords-in-python/   || https://www.geeksforgeeks.org/python/sqlalchemy-tutorial/
#referecing http status codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
from flask import Blueprint, request, jsonify, session

from werkzeug.security import generate_password_hash, check_password_hash

from aistudyassistant.models.user import User
from aistudyassitant.extenions import db


# blueprint instance(groups and organizes routes in modules)
auth_bp = Blueprint("auth", __name__)



#registering route 

@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return {"error": "No data providded"}, 400

    email = data.get("email")
    password = data.get("password")
    first_name = data.get("firstName")
    last_name = data.get("lastName")

    if not email or password: 
        return{"error":"Email and password required to register"}, 400

    # Checking if an user already exists
    existing_user = User.query.filter_by(Email=email).first() #sql query filtering email 
    if existing_user:
        return {"error": "User already exists"}, 400

    #hashing the password
    hashedPassword = generate_password_hash(password)
    
    #matching
    newUser = User(
        Email= email,
        PasswordHash = hashedPassword,
        FirstName = first_name,
        LastName = last_name
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

    user = User.query.filter_by(Email=email).first()

    if not user:
        return {"error": "Invalid credentials"}, 401

    # CHECK HASH
    if not check_password_hash(user.PasswordHash, password):
        return {"error": "Invalid credentials"}, 401

    # STORE NUMERIC USER ID
    session["user_id"] = user.UserID

    return {
        "message": "Login successful",
        "user": user.Email
    }, 200


# ---------------- LOGOUT ----------------
@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return {"message": "Logged out successfully"}, 200
