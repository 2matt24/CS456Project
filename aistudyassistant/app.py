from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from flask_cors import CORS
import os
from urllib.parse import quote_plus

from aistudyassistant.routes.auth import auth_bp
from aistudyassistant.routes.notes import notes_bp
from aistudyassistant.routes.courses import courses_bp
from aistudyassistant.routes.study_sessions import study_sessions_bp
from aistudyassistant.routes.oauth import oauth_bp, oauth
from aistudyassistant.models.user import User
from aistudyassistant.models.note import Note
from aistudyassistant.models.course import Course
from aistudyassistant.models.study_session import StudySession
from aistudyassistant.extensions import db

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "None")
app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"

allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "https://cs-456-project-huy8.vercel.app,http://localhost:5173"
).split(",")
allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]
CORS(app, supports_credentials=True, origins=allowed_origins)

server = os.getenv("DB_SERVER")
database = os.getenv("DB_NAME")
username = os.getenv("DB_USERNAME")
password = quote_plus(os.getenv("DB_PASSWORD", ""))

connection_string = (
    f"mssql+pyodbc://{username}:{password}@{server}:1433/"
    f"{database}?driver=ODBC+Driver+18+for+SQL+Server"
)

app.config["SQLALCHEMY_DATABASE_URI"] = connection_string
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
oauth.init_app(app)

app.register_blueprint(oauth_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(notes_bp)
app.register_blueprint(courses_bp)
app.register_blueprint(study_sessions_bp)

@app.route("/api/test-users")
def test_users():
    users = User.query.all()
    return {"user_count": len(users)}

from sqlalchemy import text
@app.route("/api/test-db")
def test_db():
    try:
        db.session.execute(text("SELECT 1"))
        return {"message": "Database connected successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.route("/api/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run()
