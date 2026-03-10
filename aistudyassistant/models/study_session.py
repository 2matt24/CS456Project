from datetime import datetime

from aistudyassistant.extensions import db


class StudySession(db.Model):
    __tablename__ = "StudySessions"

    SessionID = db.Column(db.Integer, primary_key=True)
    UserID = db.Column(db.Integer, db.ForeignKey("Users.UserID"), nullable=False)
    CourseID = db.Column(db.Integer, db.ForeignKey("Courses.CourseID"), nullable=False)
    SessionType = db.Column(db.String(30), nullable=False, default="study")
    DurationMinutes = db.Column(db.Integer, nullable=False)
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)