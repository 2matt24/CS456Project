from aistudyassistant.extensions import db
from sqlalchemy.sql import func


class Note(db.Model):
    __tablename__ = "Notes"

    NoteID    = db.Column("NoteID",    db.Integer,      primary_key=True)
    CourseID  = db.Column("CourseID",  db.Integer,      db.ForeignKey("Courses.CourseID"), nullable=False)
    Title     = db.Column("Title",     db.Unicode(255), nullable=False)
    Content   = db.Column("Content",   db.UnicodeText)

    # AI-generated summary — only populated when user clicks "Generate Summary".
    # server_default=db.text("NULL") tells SQLAlchemy to OMIT this column from
    # INSERT statements entirely and let the DB apply the NULL default.
    # This prevents "Invalid column name 'Summary'" / NOT NULL constraint
    # errors when creating notes before the summary is generated.
    Summary   = db.Column("Summary",   db.UnicodeText,  nullable=True, server_default=db.text("NULL"))

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
