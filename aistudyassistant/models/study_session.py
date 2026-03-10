from aistudyassistant.extensions import db
from datetime import datetime


class StudySession(db.Model):
    __tablename__ = "StudySessions"

    SessionID = db.Column(db.Integer, primary_key=True)

    CourseID = db.Column(db.Integer, db.ForeignKey("Courses.CourseID"), nullable=False)
    UserID = db.Column(db.Integer, db.ForeignKey("Users.UserID"), nullable=False)

    SessionType = db.Column(db.String(20))
    DurationMinutes = db.Column(db.Integer, nullable=False)

    StartTime = db.Column(db.DateTime, nullable=False)   # REQUIRED
    EndTime = db.Column(db.DateTime)                     # optional

    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)