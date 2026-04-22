from aistudyassistant.extensions import db
from sqlalchemy.sql import func


class Note(db.Model):
    __tablename__ = "Notes"

    NoteID    = db.Column("NoteID",    db.Integer,      primary_key=True)
    CourseID  = db.Column("CourseID",  db.Integer,      db.ForeignKey("Courses.CourseID"), nullable=False)
    Title     = db.Column("Title",     db.Unicode(255), nullable=False)
    Content   = db.Column("Content",   db.UnicodeText)

    # AI-generated summary — persisted so it survives navigation
    Summary   = db.Column("Summary",   db.UnicodeText,  nullable=True)

    FileName  = db.Column("FileName",  db.String(255))
    FileType  = db.Column("FileType",  db.String(50))

    CreatedAt = db.Column(
        "CreatedAt", db.DateTime,
        nullable=False,
        server_default=func.now()
    )
    UpdatedAt = db.Column(
        "UpdatedAt", db.DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
