from datetime import datetime, timezone

from aistudyassistant.extensions import db


class WeeklyReport(db.Model):
    __tablename__ = "WeeklyReports"

    ReportID             = db.Column(db.Integer,     primary_key=True)
    UserID               = db.Column(db.Integer,     db.ForeignKey("Users.UserID"), nullable=False)
    WeekStartDate        = db.Column(db.Date,        nullable=False)
    WeekEndDate          = db.Column(db.Date,        nullable=False)

    # Study metrics
    TotalStudyMinutes    = db.Column(db.Integer,     default=0, nullable=False)
    StudySessionsCount   = db.Column(db.Integer,     default=0, nullable=False)
    CoursesStudied       = db.Column(db.Integer,     default=0, nullable=False)

    # Content metrics
    NotesCreated         = db.Column(db.Integer,     default=0, nullable=False)

    # Progress metrics
    GoalCompletionPercent= db.Column(db.Integer,     default=0, nullable=False)
    WeeklyGoalMinutes    = db.Column(db.Integer,     nullable=True)

    # Comparison to previous week
    MinutesDelta         = db.Column(db.Integer,     nullable=True, default=0)
    PercentChange        = db.Column(db.Numeric(6, 2), nullable=True, default=0)

    # Detailed breakdown as JSON
    ReportData           = db.Column(db.UnicodeText, nullable=True)

    CreatedAt            = db.Column(db.DateTime,   default=lambda: datetime.now(timezone.utc))
