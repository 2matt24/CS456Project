from aistudyassistant.extensions import db
from sqlalchemy.sql import func


class Note(db.Model):
    __tablename__ = "Notes"

    NoteID = db.Column(db.Integer, primary_key=True)

    CourseID = db.Column(
        db.Integer,
        db.ForeignKey("Courses.CourseID"),
        nullable=False
    )

    Title = db.Column(db.String(255), nullable=False)
    Content = db.Column(db.Text)

    FileName = db.Column(db.String(255))
    FileType = db.Column(db.String(50))

    CreatedAt = db.Column(
        db.DateTime,
        nullable=False,
        server_default=func.now()
    )

    UpdatedAt = db.Column(
        db.DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )