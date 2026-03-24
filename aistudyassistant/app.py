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

from aistudyassistant.models.user import User
from aistudyassistant.models.note import Note
from aistudyassistant.models.course import Course
from aistudyassistant.models.study_session import StudySession
from aistudyassistant.routes.oauth import oauth_bp, oauth # Import the oauth object from the oauth module


app = Flask(__name__)

app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")

# Cookie/session settings
# Important for local development:
# - Keep SESSION_COOKIE_SAMESITE=Lax and SESSION_COOKIE_SECURE=False when using the Vite proxy
# Important for cross-site frontend/backend deployments:
# - Use SESSION_COOKIE_SAMESITE=None and SESSION_COOKIE_SECURE=True
session_cookie_samesite = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
secure_cookie_env = os.getenv("SESSION_COOKIE_SECURE")

if secure_cookie_env is None:
    app.config["SESSION_COOKIE_SECURE"] = session_cookie_samesite.lower() == "none"
else:
    app.config["SESSION_COOKIE_SECURE"] = secure_cookie_env.lower() == "true"

app.config["SESSION_COOKIE_HTTPONLY"] = True
#app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "None")
#app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
app.config["SESSION_COOKIE_SAMESITE"] = session_cookie_samesite

session_cookie_domain = os.getenv("SESSION_COOKIE_DOMAIN")
if session_cookie_domain:
    app.config["SESSION_COOKIE_DOMAIN"] = session_cookie_domain

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
