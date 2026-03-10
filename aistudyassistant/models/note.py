from aistudyassistant.extensions import db
from datetime import datetime
from sqlalchemy.sql import func

class Note(db.Model):
    __tablename__ = "Notes"

    NoteID = db.Column(db.Integer, primary_key=True)

    UserID = db.Column(db.Integer, db.ForeignKey("Users.UserID"), nullable=False)

    CourseID = db.Column(db.Integer, nullable=True)

    Title = db.Column(db.String(255), nullable=False)

    Content = db.Column(db.Text, nullable=False)

    Summary = db.Column(db.Text, nullable=True)

    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)

    UpdatedAt = db.Column(
        db.DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )