
# Feb 10th 2026, Amath Gaye. 
#authentication 
# references: https://flask.palletsprojects.com/en/latest/tutorial/views/ . https://www.geeksforgeeks.org/python/flask-tutorial/
# refereces: https://werkzeug.palletsprojects.com/en/latest/utils/#module-werkzeug.security  https://www.geeksforgeeks.org/python/flask-blueprints/



from flask import Blueprint, request, jsonify, session


# blueprint instance(groups and organizes routes in modules)
auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

# Temp validation 
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    return jsonify({
        "message": "Registration endpoint reached",
        "email": email
    }), 200




@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    # TEMPORARY login simulation
    session["user_id"] = email

    return jsonify({
        "message": "Login successful",
        "user": email
    }), 200


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200