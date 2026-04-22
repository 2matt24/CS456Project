from datetime import datetime, timezone

from aistudyassistant.extensions import db


class WeeklyReport(db.Model):
    __tablename__ = "WeeklyReports"

    ReportID             = db.Column(db.Integer,     primary_key=True)
    UserID               = db.Column(db.Integer,     db.ForeignKey("Users.UserID"), nullable=False)
    WeekStartDate        = db.Column(db.Date,        nullable=False)
    WeekEndDate          = db.Column(db.Date,        nullable=False)

    # Study metrics
    TotalStudyMinutes    = db.Column(db.Integer,     nullable=True, default=0)
    StudySessionsCount   = db.Column(db.Integer,     nullable=True, default=0)
    CoursesStudied       = db.Column(db.Integer,     nullable=True, default=0)

    # Content metrics
    NotesCreated         = db.Column(db.Integer,     nullable=True, default=0)
    NotesViewed          = db.Column(db.Integer,     nullable=True, default=0)
    QuizzesGenerated     = db.Column(db.Integer,     nullable=True, default=0)

    # Progress metrics
    GoalCompletionPercent= db.Column(db.Integer,     nullable=True, default=0)
    WeeklyGoalMinutes    = db.Column(db.Integer,     nullable=True)

    # Comparison to previous week
    MinutesDelta         = db.Column(db.Integer,     nullable=True, default=0)
    PercentChange        = db.Column(db.Numeric(6, 2), nullable=True, default=0)

    # Detailed breakdown as JSON
    ReportData           = db.Column(db.UnicodeText, nullable=True)

    CreatedAt            = db.Column(db.DateTime,    nullable=True, default=lambda: datetime.now(timezone.utc))
    SentAt               = db.Column(db.DateTime,    nullable=True)
