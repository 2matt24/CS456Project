
from flask import Flask
from flask_cors import CORS 
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os 

from aistudyassistant.routes.auth import auth_bp

from aistudyassistant.models.user import User


load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = False



CORS(app, supports_credentials=True) 


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



app.register_blueprint(auth_bp) 


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
