# Amath Gaye Feb 17th 2026 


#creaing the model based on user database 

from datetime import datetime

from aistudyassistant.extensions import db


class User(db.Model):
    __tablename__ = "Users"

    UserID = db.Column(db.Integer, primary_key=True)
    Email = db.Column(db.String(255), nullable=False, unique=True)
    PasswordHash = db.Column(db.String(255), nullable=False)
    FirstName = db.Column(db.String(100))
    LastName = db.Column(db.String(100))
    Phone = db.Column(db.String(30))
    Bio = db.Column(db.String(500))
    ProfilePicture = db.Column(db.String(500), nullable=True)
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)
    LastLogin = db.Column(db.DateTime)
    # Notification preferences
    StudyRemindersEnabled = db.Column(db.Boolean, nullable=False, default=True,  server_default="1")
    NoteSummariesEnabled  = db.Column(db.Boolean, nullable=False, default=True,  server_default="1")
    WeeklyReportEnabled   = db.Column(db.Boolean, nullable=False, default=False, server_default="0")