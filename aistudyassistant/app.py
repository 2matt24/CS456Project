from dotenv import load_dotenv
load_dotenv()



from flask import Flask
from flask_cors import CORS 
from flask_sqlalchemy import SQLAlchemy

import os 

from aistudyassistant.routes.auth import auth_bp
from aistudyassistant.routes.notes import notes_bp
from aistudyassistant.routes.courses import courses_bp
from aistudyassistant.routes.study_sessions import study_sessions_bp
from aistudyassistant.routes.chat import chat_bp
from aistudyassistant.routes.notifications import notifications_bp
from aistudyassistant.routes.settings import settings_bp
from aistudyassistant.routes.schedule import schedule_bp
from aistudyassistant.routes.dashboard import dashboard_bp

from aistudyassistant.models.user import User
from aistudyassistant.models.note import Note
from aistudyassistant.models.course import Course
from aistudyassistant.models.study_session import StudySession
from aistudyassistant.models.chat_history import ChatHistory
from aistudyassistant.models.notification import Notification
from aistudyassistant.models.schedule_event import ScheduleEvent
from aistudyassistant.routes.oauth import oauth_bp, oauth # Import the oauth object from the oauth module


app = Flask(__name__)

app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")





app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "None")
app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"




#CORS
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "https://cs-456-project-huy8.vercel.app,http://localhost:5173"
).split(",")

allowed_origins = [origin.strip() for origin in allowed_origins]

CORS(app, supports_credentials=True, origins=allowed_origins)

# the SQL connection string 

server = os.getenv("DB_SERVER")
database = os.getenv("DB_NAME")
username = os.getenv("DB_USERNAME")
password = os.getenv("DB_PASSWORD")

from urllib.parse import quote_plus

password = quote_plus(os.getenv("DB_PASSWORD"))

connectionString = (
    f"mssql+pyodbc://{username}:{password}@{server}:1433/"
    f"{database}?driver=ODBC+Driver+18+for+SQL+Server"
)

from aistudyassistant.extensions import db

app.config["SQLALCHEMY_DATABASE_URI"] = connectionString
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


oauth.init_app(app)
app.register_blueprint(oauth_bp) # Register the OAuth blueprint before the auth blueprint
app.register_blueprint(auth_bp) # Register the auth blueprint after the OAuth blueprint to ensure routes are properly registered
app.register_blueprint(notes_bp)
app.register_blueprint(courses_bp)
app.register_blueprint(study_sessions_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(notifications_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(schedule_bp)
app.register_blueprint(dashboard_bp)

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


@app.after_request
def debug_response(response):
    print("SET-COOKIE HEADER:", response.headers.get("Set-Cookie"))
    return response

if __name__ == "__main__":
    app.run()
