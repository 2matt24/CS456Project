from datetime import datetime, timezone

from aistudyassistant.extensions import db


class WeeklyReport(db.Model):
    __tablename__ = "WeeklyReports"

    # Explicit column-name strings ensure SQLAlchemy uses the correct
    # PascalCase DB column names regardless of ORM attribute naming.
    ReportID             = db.Column("ReportID",             db.Integer,        primary_key=True)
    UserID               = db.Column("UserID",               db.Integer,        db.ForeignKey("Users.UserID"), nullable=False)
    WeekStartDate        = db.Column("WeekStartDate",        db.Date,           nullable=False)
    WeekEndDate          = db.Column("WeekEndDate",          db.Date,           nullable=False)

    # Study metrics
    TotalStudyMinutes    = db.Column("TotalStudyMinutes",    db.Integer,        nullable=True, default=0)
    StudySessionsCount   = db.Column("StudySessionsCount",   db.Integer,        nullable=True, default=0)
    CoursesStudied       = db.Column("CoursesStudied",       db.Integer,        nullable=True, default=0)

    # Content metrics
    NotesCreated         = db.Column("NotesCreated",         db.Integer,        nullable=True, default=0)
    NotesViewed          = db.Column("NotesViewed",          db.Integer,        nullable=True, default=0)
    QuizzesGenerated     = db.Column("QuizzesGenerated",     db.Integer,        nullable=True, default=0)

    # Progress metrics
    GoalCompletionPercent= db.Column("GoalCompletionPercent",db.Integer,        nullable=True, default=0)
    WeeklyGoalMinutes    = db.Column("WeeklyGoalMinutes",    db.Integer,        nullable=True)

    # Comparison to previous week
    MinutesDelta         = db.Column("MinutesDelta",         db.Integer,        nullable=True, default=0)
    PercentChange        = db.Column("PercentChange",        db.Numeric(6, 2),  nullable=True, default=0)

    # Detailed breakdown as JSON
    ReportData           = db.Column("ReportData",           db.UnicodeText,    nullable=True)

    # Timestamps
    CreatedAt            = db.Column("CreatedAt",            db.DateTime,       nullable=True,
                                     default=lambda: datetime.now(timezone.utc))
    SentAt               = db.Column("SentAt",               db.DateTime,       nullable=True)
