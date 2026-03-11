from datetime import datetime

from aistudyassistant.extensions import db


class Course(db.Model):
    __tablename__ = "Courses"

    CourseID = db.Column(db.Integer, primary_key=True)
    UserID = db.Column(db.Integer, db.ForeignKey("Users.UserID"), nullable=False)
    CourseName = db.Column(db.String(255), nullable=False)
    CourseCode = db.Column(db.String(50), nullable=True)
    Semester = db.Column(db.String(50), nullable=True)
    Color = db.Column(db.String(20), nullable=True)
    Icon = db.Column(db.String(20), nullable=True)
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)