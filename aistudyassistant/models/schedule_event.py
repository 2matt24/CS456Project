from datetime import datetime, timezone
import json

from aistudyassistant.extensions import db


class ScheduleEvent(db.Model):
    __tablename__ = "ScheduleEvents"

    EventID   = db.Column(db.Integer,      primary_key=True)
    UserID    = db.Column(db.Integer,      db.ForeignKey("Users.UserID"), nullable=False)
    Title     = db.Column(db.Unicode(255), nullable=False)
    Location  = db.Column(db.Unicode(255), nullable=True)
    Type      = db.Column(db.String(20),   nullable=False, default="school")   # school | work | personal
    Color     = db.Column(db.String(20),   nullable=True,  default="#667eea")
    Repeat    = db.Column(db.String(20),   nullable=False, default="once")     # once | daily | weekly | monthly
    Days      = db.Column(db.Unicode(500), nullable=True)
    StartTime = db.Column(db.Time,         nullable=False)
    EndTime   = db.Column(db.Time,         nullable=False)
    StartDate = db.Column(db.Date,         nullable=False)
    EndDate   = db.Column(db.Date,         nullable=True)
    CreatedAt = db.Column(db.DateTime,     default=lambda: datetime.now(timezone.utc))
    UpdatedAt = db.Column(db.DateTime,     default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # ── helpers

    def get_days(self):
        """Return Days as a Python list (deserialise from JSON string)."""
        if not self.Days:
            return []
        try:
            return json.loads(self.Days)
        except (ValueError, TypeError):
            return []

    def set_days(self, days_list):
        """Accept a list and store it as a JSON string."""
        if isinstance(days_list, list):
            self.Days = json.dumps(days_list)
        else:
            self.Days = None
